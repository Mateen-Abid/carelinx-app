-- =====================================================
-- Auto-Assign Doctor Role from Clinic Invitation
-- =====================================================
-- This function automatically assigns 'doctor' role to a user
-- when they accept a clinic_admin_invitation
-- =====================================================

CREATE OR REPLACE FUNCTION public.auto_assign_doctor_role_from_invitation(
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
  v_doctor_id UUID;
  v_result json;
BEGIN
  -- Find pending clinic invitation for this email
  SELECT *
  INTO v_invitation
  FROM public.clinic_admin_invitations
  WHERE LOWER(email) = LOWER(p_user_email)
    AND status = 'pending'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no invitation found, return success (user is regular signup)
  IF v_invitation IS NULL THEN
    RETURN json_build_object(
      'success', true,
      'message', 'No pending clinic invitation found',
      'role_assigned', false
    );
  END IF;

  -- Get doctor_id from invitation
  v_doctor_id := v_invitation.doctor_id;

  -- If no doctor_id, return error
  IF v_doctor_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Doctor record not found in invitation',
      'role_assigned', false
    );
  END IF;

  -- Update doctor record with user_id
  UPDATE public.doctors
  SET user_id = p_user_id,
      updated_at = now()
  WHERE id = v_doctor_id;

  -- Assign 'doctor' role to user_roles table (upsert to handle existing records)
  INSERT INTO public.user_roles (user_id, role_type, is_active)
  VALUES (p_user_id, 'doctor', true)
  ON CONFLICT (user_id) 
  DO UPDATE SET
    role_type = 'doctor',
    is_active = true,
    updated_at = now();

  -- Update invitation status to 'accepted'
  UPDATE public.clinic_admin_invitations
  SET status = 'accepted',
      accepted_at = now(),
      accepted_by = p_user_id,
      updated_at = now()
  WHERE id = v_invitation.id;

  RETURN json_build_object(
    'success', true,
    'message', 'Doctor role assigned successfully',
    'role_assigned', true,
    'doctor_id', v_doctor_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'role_assigned', false
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.auto_assign_doctor_role_from_invitation(UUID, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.auto_assign_doctor_role_from_invitation IS 
'Automatically assigns doctor role to user when they accept a clinic_admin_invitation';

