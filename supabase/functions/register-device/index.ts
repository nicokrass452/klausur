import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALGORITHM = { name: 'ECDSA', namedCurve: 'P-256' };
const SIGN_ALGORITHM = { name: 'ECDSA', hash: 'SHA-256' };

const anonClient = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_ANON_KEY'),
  { auth: { persistSession: false } }
);

let signingKeyPromise: Promise<CryptoKey> | undefined;

function offlineEnabled(): boolean {
  return Deno.env.get('OFFLINE_READONLY_ENABLED') === 'true';
}

function getAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );
}

function getSigningKey(): Promise<CryptoKey> {
  const signingKey = Deno.env.get('OFFLINE_SIGNING_KEY');
  if (!signingKey) {
    throw new Error('OFFLINE_SIGNING_KEY is not configured');
  }
  signingKeyPromise ??= crypto.subtle.importKey(
    'pkcs8',
    base64UrlToBytes(signingKey),
    ALGORITHM,
    false,
    ['sign']
  );
  return signingKeyPromise;
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlEncodeJson(value: unknown): string {
  return base64UrlEncodeBytes(
    new TextEncoder().encode(JSON.stringify(value))
  );
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function base64UrlToBytes(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function hashToken(token: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return bytesToHex(new Uint8Array(hash));
}

async function signJWT(payload: any, key: CryptoKey): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  const headerB64 = base64UrlEncodeJson(header);
  const payloadB64 = base64UrlEncodeJson(payload);
  const data = `${headerB64}.${payloadB64}`;

  const signature = await crypto.subtle.sign(
    SIGN_ALGORITHM,
    key,
    new TextEncoder().encode(data)
  );

  const sigArray = new Uint8Array(signature);
  if (sigArray.length !== 64) {
    throw new Error('Invalid ES256 signature length');
  }

  const sigB64 = base64UrlEncodeBytes(sigArray);
  return `${headerB64}.${payloadB64}.${sigB64}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!offlineEnabled()) {
    return Response.json({ error: 'Offline read-only access is disabled' }, { status: 404 });
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: { user }, error: authError } = await anonClient.auth.getUser(
    authHeader.replace('Bearer ', '')
  );
  if (authError || !user) {
    return Response.json({ error: 'Invalid session' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { device_hash, public_key_jwk, challenge_id, device_signature } = body;

    // Validate challenge
    const adminClient = getAdminClient();

    const { data: challenge, error: challengeError } = await adminClient
      .from('device_challenges')
      .select('*')
      .eq('challenge_id', challenge_id)
      .eq('user_id', user.id)
      .eq('device_hash', device_hash)
      .gt('expires_at', new Date().toISOString())
      .is('consumed_at', null)
      .single();

    if (challengeError || !challenge) {
      return Response.json({ error: 'Invalid or expired challenge' }, { status: 400 });
    }

    // Verify device signature
    const devicePublicKey = await crypto.subtle.importKey(
      'jwk',
      public_key_jwk,
      ALGORITHM,
      true,
      ['verify']
    );

    const challengeValid = await crypto.subtle.verify(
      SIGN_ALGORITHM,
      devicePublicKey,
      base64UrlToBytes(device_signature),
      new TextEncoder().encode(challenge.nonce)
    );
    if (!challengeValid) {
      return Response.json({ error: 'Invalid device signature' }, { status: 400 });
    }

    // Verify device_hash matches public key thumbprint
    const spki = await crypto.subtle.exportKey('spki', devicePublicKey);
    const dev_thumbprint = await crypto.subtle.digest('SHA-256', spki);
    const thumbprint_hex = bytesToHex(new Uint8Array(dev_thumbprint));

    if (device_hash !== thumbprint_hex) {
      return Response.json({
        error: 'device_hash does not match public key'
      }, { status: 400 });
    }

    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    // Single RPC call - consume challenge AND get session ID atomically
    const { data: consumeResult, error: consumeError } = await adminClient.rpc(
      'consume_challenge_and_get_session',
      {
        p_challenge_id: challenge_id,
        p_user_id: user.id,
        p_device_hash: device_hash,
        p_public_key_jwk: public_key_jwk,
        p_expires_at: expiresAt.toISOString()
      }
    );

    if (consumeError || !consumeResult?.[0]?.success) {
      return Response.json({
        error: 'Failed to consume challenge',
        reason: consumeResult?.[0]?.reason
      }, { status: 400 });
    }

    const deviceSessionId = consumeResult[0].device_session_id;

    // Sign the grant with the real database ID
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      sub: user.id,
      sid: deviceSessionId,
      scope: 'offline_read',
      aud: 'klausurplaner-offline-cache',
      iat: now,
      exp: now + (90 * 24 * 60 * 60),
      cache_max_age_days: 90,
      dev_thumbprint: thumbprint_hex
    };

    const grant = await signJWT(payload, await getSigningKey());
    const grant_hash = await hashToken(grant);

    // Second RPC to update token_hash by exact session ID
    const { data: updateResult, error: updateError } = await adminClient.rpc(
      'update_device_token_hash',
      {
        p_device_session_id: deviceSessionId,
        p_user_id: user.id,
        p_device_hash: device_hash,
        p_token_hash: grant_hash
      }
    );

    if (updateError || !updateResult?.[0]?.success) {
      return Response.json({
        error: 'Failed to finalize registration',
        reason: updateResult?.[0]?.reason
      }, { status: 500 });
    }

    return Response.json({
      offline_grant: grant,
      device_session_id: deviceSessionId
    });
  } catch (error) {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
});
