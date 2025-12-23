-- =====================================================
-- Create Database Function to Delete Specialty
-- =====================================================
-- This function bypasses RLS issues by running as SECURITY DEFINER
-- Only super_admin can call this function
-- =====================================================

CREATE OR REPLACE FUNCTION public.delete_specialty_and_services(specialty_uuid UUID)
RETURNS JSON AS $$
DECLARE
  deleted_services_count INTEGER;
  result JSON;
BEGIN
  -- Check if user is super_admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role_type = 'super_admin'
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Only super_admin can delete specialties';
  END IF;

  -- Soft delete all services under this specialty
  UPDATE public.super_admin_services
  SET is_active = false,
      updated_at = now()
  WHERE specialty_id = specialty_uuid
  AND is_active = true;
  
  GET DIAGNOSTICS deleted_services_count = ROW_COUNT;

  -- Soft delete the specialty itself
  UPDATE public.super_admin_specialties
  SET is_active = false,
      updated_at = now()
  WHERE id = specialty_uuid;

  -- Return result
  result := json_build_object(
    'success', true,
    'specialty_id', specialty_uuid,
    'deleted_services_count', deleted_services_count
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

