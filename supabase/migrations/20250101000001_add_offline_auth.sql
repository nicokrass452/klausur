-- Offline Read-Only Access Tables

-- Device sessions table
CREATE TABLE device_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_hash TEXT NOT NULL,
  public_key_jwk JSONB NOT NULL,
  token_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  scope TEXT NOT NULL DEFAULT 'offline_read',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,

  UNIQUE (user_id, device_hash),
  CHECK (status IN ('pending', 'active', 'revoked')),
  CHECK (token_hash IS NOT NULL OR status = 'pending')
);

CREATE INDEX idx_device_sessions_user ON device_sessions(user_id);
CREATE INDEX idx_device_sessions_active ON device_sessions(user_id, device_hash, expires_at)
  WHERE status = 'active' AND revoked_at IS NULL;

-- Challenges table with user_id and consumed_at
CREATE TABLE device_challenges (
  challenge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_hash TEXT NOT NULL,
  nonce TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ
);

CREATE INDEX idx_challenges_expires ON device_challenges(expires_at) WHERE consumed_at IS NULL;
CREATE INDEX idx_challenges_user ON device_challenges(user_id, device_hash, challenge_id) WHERE consumed_at IS NULL;

-- Clean up expired challenges periodically
CREATE OR REPLACE FUNCTION cleanup_expired_challenges()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM device_challenges
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
