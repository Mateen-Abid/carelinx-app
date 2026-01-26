-- Add RLS policies to allow clinic admin to view, update, and delete patient profiles
-- Clinic admin can only manage profiles of patients who have bookings with their clinic

-- ============================================
-- PROFILES TABLE - Allow clinic_admin to view, update, and delete patient profiles
-- ============================================

-- Drop existing policies if they exist (but keep super admin policies)
DROP POLICY IF EXISTS "Clinic admin can view patient profiles" ON public.profiles;
DROP POLICY IF EXISTS "Clinic admin can update patient profiles" ON public.profiles;
DROP POLICY IF EXISTS "Clinic admin can delete patient profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can delete all profiles" ON public.profiles;

-- Ensure super admin SELECT policy exists (using helper function from user_roles table)
-- This is critical for super admin to view all profiles
DROP POLICY IF EXISTS "Super admin can view all profiles" ON public.profiles;
CREATE POLICY "Super admin can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can always view their own profile
  auth.uid() = user_id OR 
  -- Super admin can view all profiles (using helper function)
  public.is_super_admin()
);

-- Policy: Clinic admin can view profiles of patients who have bookings with their clinic
CREATE POLICY "Clinic admin can view patient profiles" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can always view their own profile
  auth.uid() = user_id OR 
  -- Clinic admin can view profiles of patients who have bookings with their clinic
  (
    public.is_clinic_admin() AND
    EXISTS (
      SELECT 1 
      FROM public.bookings b
      INNER JOIN public.user_roles ur ON ur.user_id = auth.uid()
      WHERE b.user_id = profiles.user_id
      AND ur.role_type = 'clinic_admin'
      AND ur.is_active = true
      AND (
        b.clinic_id = ur.clinic_id OR
        b.clinic = (SELECT name FROM public.clinics WHERE id = ur.clinic_id)
      )
    )
  )
);

-- Policy: Clinic admin can update profiles of patients who have bookings with their clinic
CREATE POLICY "Clinic admin can update patient profiles" 
ON public.profiles 
FOR UPDATE 
USING (
  -- Users can always update their own profile
  auth.uid() = user_id OR 
  -- Super admin can update all profiles (using helper function)
  public.is_super_admin() OR
  -- Clinic admin can update profiles of patients who have bookings with their clinic
  (
    public.is_clinic_admin() AND
    EXISTS (
      SELECT 1 
      FROM public.bookings b
      INNER JOIN public.user_roles ur ON ur.user_id = auth.uid()
      WHERE b.user_id = profiles.user_id
      AND ur.role_type = 'clinic_admin'
      AND ur.is_active = true
      AND (
        b.clinic_id = ur.clinic_id OR
        b.clinic = (SELECT name FROM public.clinics WHERE id = ur.clinic_id)
      )
    )
  )
)
WITH CHECK (
  -- Users can always update their own profile
  auth.uid() = user_id OR 
  -- Super admin can update all profiles
  public.is_super_admin() OR
  -- Clinic admin can update profiles of patients who have bookings with their clinic
  (
    public.is_clinic_admin() AND
    EXISTS (
      SELECT 1 
      FROM public.bookings b
      INNER JOIN public.user_roles ur ON ur.user_id = auth.uid()
      WHERE b.user_id = profiles.user_id
      AND ur.role_type = 'clinic_admin'
      AND ur.is_active = true
      AND (
        b.clinic_id = ur.clinic_id OR
        b.clinic = (SELECT name FROM public.clinics WHERE id = ur.clinic_id)
      )
    )
  )
);

-- Policy: Super admin can delete all profiles
CREATE POLICY "Super admin can delete all profiles" 
ON public.profiles 
FOR DELETE 
USING (
  -- Users can always delete their own profile
  auth.uid() = user_id OR 
  -- Super admin can delete all profiles (using helper function)
  public.is_super_admin()
);

-- Policy: Clinic admin can delete profiles of patients who have bookings with their clinic
CREATE POLICY "Clinic admin can delete patient profiles" 
ON public.profiles 
FOR DELETE 
USING (
  -- Users can always delete their own profile
  auth.uid() = user_id OR 
  -- Super admin can delete all profiles
  public.is_super_admin() OR
  -- Clinic admin can delete profiles of patients who have bookings with their clinic
  (
    public.is_clinic_admin() AND
    EXISTS (
      SELECT 1 
      FROM public.bookings b
      INNER JOIN public.user_roles ur ON ur.user_id = auth.uid()
      WHERE b.user_id = profiles.user_id
      AND ur.role_type = 'clinic_admin'
      AND ur.is_active = true
      AND (
        b.clinic_id = ur.clinic_id OR
        b.clinic = (SELECT name FROM public.clinics WHERE id = ur.clinic_id)
      )
    )
  )
);
