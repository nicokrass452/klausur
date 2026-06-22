-- Function to allow users to completely delete their account and associated data
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- We assume that all tables have ON DELETE CASCADE setup for user_id.
  -- But wait, deleting from auth.users requires elevated privileges, which this function
  -- can do because it's SECURITY DEFINER.

  -- The user to delete is the currently authenticated user
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
