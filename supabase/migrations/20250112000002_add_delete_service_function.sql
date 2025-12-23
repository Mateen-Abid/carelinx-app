-- =====================================================
-- Create Database Function to Delete Service
-- =====================================================
-- This function bypasses RLS issues by running as SECURITY DEFINER
-- Only super_admin can call this function
-- =====================================================

CREATE OR REPLACE FUNCTION public.delete_service(service_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Check if user is super_admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role_type = 'super_admin'
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Only super_admin can delete services';
  END IF;

  -- Soft delete the service
  UPDATE public.super_admin_services
  SET is_active = false,
      updated_at = now()
  WHERE id = service_uuid;

  -- Check if service was found and updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service not found';
  END IF;

  -- Return result
  result := json_build_object(
    'success', true,
    'service_id', service_uuid
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

