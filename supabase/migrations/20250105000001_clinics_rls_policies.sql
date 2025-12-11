-- Update RLS policies to ensure super_admin has full access to clinics
-- This is a backup/confirmation migration

-- Drop and recreate policies to ensure they're correct
DROP POLICY IF EXISTS "Super admin can view all clinics" ON public.clinics;
DROP POLICY IF EXISTS "Super admin can insert clinics" ON public.clinics;
DROP POLICY IF EXISTS "Super admin can update all clinics" ON public.clinics;
DROP POLICY IF EXISTS "Super admin can delete all clinics" ON public.clinics;
DROP POLICY IF EXISTS "Clinic admin can view their own clinic" ON public.clinics;

-- Super admin policies
CREATE POLICY "Super admin can view all clinics" 
ON public.clinics 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Super admin can insert clinics" 
ON public.clinics 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Super admin can update all clinics" 
ON public.clinics 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Super admin can delete all clinics" 
ON public.clinics 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Clinic admin can view their own clinic
CREATE POLICY "Clinic admin can view their own clinic" 
ON public.clinics 
FOR SELECT 
USING (
  clinic_admin_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

