-- Automatically link invited users to their provider contact when they sign up

CREATE OR REPLACE FUNCTION link_invited_user_to_contact()
RETURNS TRIGGER AS $$
DECLARE
  v_contact_id UUID;
  v_provider_id UUID;
  v_user_email TEXT;
BEGIN
  -- Get the user's email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = NEW.id;

  -- Check if user was invited with contact metadata
  IF NEW.raw_user_meta_data ? 'contact_id' THEN
    v_contact_id := (NEW.raw_user_meta_data->>'contact_id')::UUID;

    -- Update the contact to link to this user and mark as accepted
    UPDATE linksy_provider_contacts
    SET
      user_id = NEW.id,
      invitation_accepted_at = NOW(),
      status = 'active',
      email = NULL,  -- Clear temporary email since we now have user_id
      full_name = NULL  -- Clear temporary full_name since we now have user_id
    WHERE id = v_contact_id
      AND user_id IS NULL;  -- Only update if not already linked

  -- Or check if there's a contact with matching email waiting for this user
  ELSIF v_user_email IS NOT NULL THEN
    -- Try to find a contact with this email but no user_id
    UPDATE linksy_provider_contacts
    SET
      user_id = NEW.id,
      invitation_accepted_at = NOW(),
      status = 'active',
      email = NULL,  -- Clear temporary email
      full_name = NULL  -- Clear temporary full_name
    WHERE email = v_user_email
      AND user_id IS NULL
      AND status = 'invited';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on public.users table (after handle_new_user creates the record)
DROP TRIGGER IF EXISTS link_invited_user_trigger ON public.users;

CREATE TRIGGER link_invited_user_trigger
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION link_invited_user_to_contact();

COMMENT ON FUNCTION link_invited_user_to_contact() IS 'Automatically links invited users to their provider contact record when they sign up';
