-- =====================================================
-- Allow Public Access to Super Admin Specialties and Services
-- =====================================================
-- This migration allows public (unauthenticated) users
-- to view active specialties and services from super_admin tables
-- =====================================================

-- Allow public users (including unauthenticated) to view active specialties
CREATE POLICY IF NOT EXISTS "Public can view active specialties" 
ON public.super_admin_specialties 
FOR SELECT 
USING (
  is_active = true
  OR
  -- Super admins can view all
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'super_admin' 
    AND is_active = true
  )
  OR
  -- Clinic admins can view all
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'clinic_admin' 
    AND is_active = true
  )
);

-- Allow public users (including unauthenticated) to view active services
CREATE POLICY IF NOT EXISTS "Public can view active services" 
ON public.super_admin_services 
FOR SELECT 
USING (
  is_active = true
  OR
  -- Super admins can view all
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'super_admin' 
    AND is_active = true
  )
  OR
  -- Clinic admins can view all
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'clinic_admin' 
    AND is_active = true
  )
);

