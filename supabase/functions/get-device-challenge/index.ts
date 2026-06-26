import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const anonClient = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_ANON_KEY'),
  { auth: { persistSession: false } }
);

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
    const device_hash = body.device_hash;

    if (!device_hash) {
      return Response.json({ error: 'device_hash required' }, { status: 400 });
    }

    const challenge_id = crypto.randomUUID();
    const nonce = crypto.randomUUID();
    const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error: dbError } = await getAdminClient()
      .from('device_challenges')
      .insert({
        challenge_id,
        user_id: user.id,
        device_hash,
        nonce,
        expires_at
      });

    if (dbError) {
      return Response.json({ error: 'Failed to create challenge' }, { status: 500 });
    }

    return Response.json({
      challenge_id,
      nonce
    });
  } catch (error) {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
});
