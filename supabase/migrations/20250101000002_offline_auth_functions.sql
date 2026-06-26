-- Offline Auth RPC Functions

-- Consume challenge and get session ID atomically
CREATE OR REPLACE FUNCTION consume_challenge_and_get_session(
  p_challenge_id UUID,
  p_user_id UUID,
  p_device_hash TEXT,
  p_public_key_jwk JSONB,
  p_expires_at TIMESTAMPTZ
)
RETURNS TABLE (
  success BOOLEAN,
  reason TEXT,
  device_session_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device_session_id UUID;
BEGIN
  -- Step 1: Atomically consume challenge
  UPDATE device_challenges
  SET consumed_at = NOW()
  WHERE challenge_id = p_challenge_id
    AND user_id = p_user_id
    AND device_hash = p_device_hash
    AND expires_at > NOW()
    AND consumed_at IS NULL;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invalid or expired challenge'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Step 2: Upsert device session and return its ID
  INSERT INTO device_sessions (
    user_id,
    device_hash,
    public_key_jwk,
    status,
    scope,
    expires_at
  )
  VALUES (
    p_user_id,
    p_device_hash,
    p_public_key_jwk,
    'pending',
    'offline_read',
    p_expires_at
  )
  ON CONFLICT (user_id, device_hash)
  DO UPDATE SET
    public_key_jwk = EXCLUDED.public_key_jwk,
    status = 'pending',
    expires_at = EXCLUDED.expires_at,
    last_seen = NOW(),
    revoked_at = NULL
  RETURNING id INTO v_device_session_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_device_session_id;
END;
$$;

-- Update token hash for a device session
CREATE OR REPLACE FUNCTION update_device_token_hash(
  p_device_session_id UUID,
  p_user_id UUID,
  p_device_hash TEXT,
  p_token_hash TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE device_sessions
  SET token_hash = p_token_hash,
      status = 'active',
      last_seen = NOW()
  WHERE id = p_device_session_id
    AND user_id = p_user_id
    AND device_hash = p_device_hash;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Device session not found'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;

-- Revoke a device session
CREATE OR REPLACE FUNCTION revoke_device_session(
  p_device_session_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE device_sessions
  SET revoked_at = NOW()
  WHERE id = p_device_session_id
    AND user_id = p_user_id;

  RETURN FOUND;
END;
$$;
