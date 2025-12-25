-- =====================================================
-- Auto Assign Role on Email Confirmation
-- =====================================================
-- This function automatically assigns role from pending invitation
-- when a user confirms their email after signup
-- =====================================================

-- Create function to auto-assign role from invitation
CREATE OR REPLACE FUNCTION public.auto_assign_role_from_invitation(
  p_user_id UUID,
  p_user_email TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_role_type TEXT;
  v_result json;
BEGIN
  -- Find pending invitation for this email
  SELECT *
  INTO v_invitation
  FROM public.super_admin_invitations
  WHERE LOWER(email) = LOWER(p_user_email)
    AND status = 'pending'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no invitation found, return success (user is regular signup)
  IF v_invitation IS NULL THEN
    RETURN json_build_object(
      'success', true,
      'message', 'No pending invitation found',
      'role_assigned', false
    );
  END IF;

  -- Get role_type from invitation
  v_role_type := v_invitation.role_type;

  -- Validate role_type
  IF v_role_type NOT IN ('super_admin', 'clinic_admin') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid role_type in invitation',
      'role_assigned', false
    );
  END IF;

  -- Assign role to user_roles table (upsert to handle existing records)
  INSERT INTO public.user_roles (user_id, role_type, is_active)
  VALUES (p_user_id, v_role_type, true)
  ON CONFLICT (user_id) 
  DO UPDATE SET
    role_type = EXCLUDED.role_type,
    is_active = EXCLUDED.is_active,
    updated_at = now();

  -- Update invitation status to 'accepted'
  UPDATE public.super_admin_invitations
  SET 
    status = 'accepted',
    accepted_at = now(),
    accepted_by = p_user_id,
    updated_at = now()
  WHERE id = v_invitation.id;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'Role assigned successfully',
    'role_assigned', true,
    'role_type', v_role_type,
    'invitation_id', v_invitation.id
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return failure
    RAISE WARNING 'Error in auto_assign_role_from_invitation: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'role_assigned', false
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.auto_assign_role_from_invitation(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_assign_role_from_invitation(UUID, TEXT) TO anon;

-- Add comment
COMMENT ON FUNCTION public.auto_assign_role_from_invitation IS 
'Automatically assigns role from pending invitation when user confirms email. Called after email confirmation.';

