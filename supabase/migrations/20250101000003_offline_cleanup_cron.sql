-- Hourly cleanup for expired offline device challenges.
--
-- Before running this migration in Supabase, store the runtime values:
--   select vault.create_secret('your-cleanup-cron-key', 'CLEANUP_CRON_KEY');
--   alter database postgres set app.settings.supabase_url = 'https://your-project-ref.supabase.co';
--
-- Manual test:
--   select public.invoke_cleanup_expired_challenges();
-- or call net.http_post directly with the same URL and Vault bearer token.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

CREATE OR REPLACE FUNCTION public.invoke_cleanup_expired_challenges()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
DECLARE
  v_project_url TEXT := current_setting('app.settings.supabase_url', TRUE);
  v_cron_key TEXT;
  v_request_id BIGINT;
BEGIN
  IF v_project_url IS NULL OR length(trim(v_project_url)) = 0 THEN
    RAISE EXCEPTION 'app.settings.supabase_url is not configured';
  END IF;

  SELECT decrypted_secret
  INTO v_cron_key
  FROM vault.decrypted_secrets
  WHERE name = 'CLEANUP_CRON_KEY'
  LIMIT 1;

  IF v_cron_key IS NULL OR length(trim(v_cron_key)) = 0 THEN
    RAISE EXCEPTION 'CLEANUP_CRON_KEY is not configured in Supabase Vault';
  END IF;

  SELECT net.http_post(
    url := v_project_url || '/functions/v1/cleanup-expired-challenges',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_cron_key,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )
  INTO v_request_id;

  RETURN v_request_id;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-device-challenges') THEN
    PERFORM cron.unschedule('cleanup-expired-device-challenges');
  END IF;

  PERFORM cron.schedule(
    'cleanup-expired-device-challenges',
    '0 * * * *',
    'select public.invoke_cleanup_expired_challenges();'
  );
END;
$$;
