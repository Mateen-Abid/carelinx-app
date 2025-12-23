-- =====================================================
-- Remove Public Access to Super Admin Services
-- =====================================================
-- This migration removes the public access policies
-- and restores the original policies that only allow
-- super_admin and clinic_admin to view services
-- =====================================================

-- Remove public access policy for specialties
DROP POLICY IF EXISTS "Public can view active specialties" ON public.super_admin_specialties;

-- Restore original policy for specialties (only super_admin and clinic_admin can view)
DROP POLICY IF EXISTS "Super admin can view all specialties" ON public.super_admin_specialties;

CREATE POLICY "Super admin can view all specialties" 
ON public.super_admin_specialties 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'super_admin' 
    AND is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'clinic_admin' 
    AND is_active = true
  )
);

-- Remove public access policy for services
DROP POLICY IF EXISTS "Public can view active services" ON public.super_admin_services;

-- Restore original policy for services (only super_admin and clinic_admin can view)
DROP POLICY IF EXISTS "Super admin can view all services" ON public.super_admin_services;

CREATE POLICY "Super admin can view all services" 
ON public.super_admin_services 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'super_admin' 
    AND is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'clinic_admin' 
    AND is_active = true
  )
);

