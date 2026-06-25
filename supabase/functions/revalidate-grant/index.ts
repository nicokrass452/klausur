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
    return Response.json({ valid: false, reason: 'Offline read-only access is disabled' });
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
    const { device_session_id, grant_hash } = body;

    const adminClient = getAdminClient();

    const { data: session, error } = await adminClient
      .from('device_sessions')
      .select('*')
      .eq('id', device_session_id)
      .eq('user_id', user.id)
      .eq('token_hash', grant_hash)
      .single();

    if (error || !session) {
      return Response.json({
        valid: false,
        reason: 'Grant not found or mismatched'
      });
    }

    if (session.revoked_at) {
      return Response.json({
        valid: false,
        reason: 'Grant was revoked'
      });
    }

    if (new Date(session.expires_at) < new Date()) {
      return Response.json({
        valid: false,
        reason: 'Grant expired'
      });
    }

    if (session.status !== 'active') {
      return Response.json({
        valid: false,
        reason: 'Grant not active'
      });
    }

    // Update last_seen
    await adminClient
      .from('device_sessions')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', device_session_id);

    return Response.json({
      valid: true,
      expires_at: session.expires_at
    });
  } catch (error) {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
});
