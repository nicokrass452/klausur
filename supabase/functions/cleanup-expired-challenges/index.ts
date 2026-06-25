import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const adminClient = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false } }
);

const cronKey = Deno.env.get('CLEANUP_CRON_KEY');

Deno.serve(async (req) => {
  // Verify authorization
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${cronKey}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, error } = await adminClient
      .from('device_challenges')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select();

    if (error) {
      return Response.json({ error: 'Cleanup failed' }, { status: 500 });
    }

    return Response.json({
      deleted: data ? data.length : 0,
      success: true
    });
  } catch (error) {
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
});