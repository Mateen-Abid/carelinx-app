-- =====================================================
-- Fix RLS Policy for super_admin_services UPDATE
-- =====================================================
-- The UPDATE policy needs both USING and WITH CHECK clauses
-- Uses the existing is_super_admin() helper function for consistency
-- =====================================================

-- Ensure the is_super_admin() function exists (from previous migration)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role_type = 'super_admin' 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Super admin can update services" ON public.super_admin_services;

-- Create new UPDATE policy with both USING and WITH CHECK
CREATE POLICY "Super admin can update services" 
ON public.super_admin_services 
FOR UPDATE 
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Also fix the UPDATE policy for super_admin_specialties to be consistent
DROP POLICY IF EXISTS "Super admin can update specialties" ON public.super_admin_specialties;

CREATE POLICY "Super admin can update specialties" 
ON public.super_admin_specialties 
FOR UPDATE 
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

