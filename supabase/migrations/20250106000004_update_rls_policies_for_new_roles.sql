-- =====================================================
-- Update RLS Policies to Use New user_roles Table
-- =====================================================
-- This updates existing RLS policies to use the new user_roles table
-- instead of checking profiles.role directly

-- Helper function to check if user is super_admin
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

-- Helper function to check if user is clinic_admin
CREATE OR REPLACE FUNCTION public.is_clinic_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role_type = 'clinic_admin' 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's clinic_id (for clinic_admin)
CREATE OR REPLACE FUNCTION public.get_user_clinic_id()
RETURNS UUID AS $$
DECLARE
  clinic_uuid UUID;
BEGIN
  SELECT clinic_id INTO clinic_uuid
  FROM public.user_roles
  WHERE user_id = auth.uid() 
  AND role_type = 'clinic_admin' 
  AND is_active = true;
  
  RETURN clinic_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update profiles RLS policies only if profiles table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    DROP POLICY IF EXISTS "Super admin can view all profiles" ON public.profiles;
    CREATE POLICY "Super admin can view all profiles" 
    ON public.profiles 
    FOR SELECT 
    USING (
      auth.uid() = user_id OR 
      public.is_super_admin()
    );
  END IF;
END $$;

-- Update bookings RLS policies (if they exist)
-- Note: These will be updated by existing migrations, but we ensure they work with new system
DO $$
BEGIN
  -- Only update if policies exist
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bookings' 
    AND policyname LIKE '%super_admin%'
  ) THEN
    -- Policies will be updated by the existing fix_bookings_rls migration
    -- This is just a placeholder to ensure compatibility
    NULL;
  END IF;
END $$;

-- Update clinics RLS policies only if clinics table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clinics') THEN
    DROP POLICY IF EXISTS "Super admin can view all clinics" ON public.clinics;
    DROP POLICY IF EXISTS "Super admin can insert clinics" ON public.clinics;
    DROP POLICY IF EXISTS "Super admin can update all clinics" ON public.clinics;
    DROP POLICY IF EXISTS "Super admin can delete all clinics" ON public.clinics;

    CREATE POLICY "Super admin can view all clinics" 
    ON public.clinics 
    FOR SELECT 
    USING (public.is_super_admin());

    CREATE POLICY "Super admin can insert clinics" 
    ON public.clinics 
    FOR INSERT 
    WITH CHECK (public.is_super_admin());

    CREATE POLICY "Super admin can update all clinics" 
    ON public.clinics 
    FOR UPDATE 
    USING (public.is_super_admin());

    CREATE POLICY "Super admin can delete all clinics" 
    ON public.clinics 
    FOR DELETE 
    USING (public.is_super_admin());

    -- Allow clinic_admin to view their own clinic
    DROP POLICY IF EXISTS "Clinic admin can view own clinic" ON public.clinics;
    CREATE POLICY "Clinic admin can view own clinic" 
    ON public.clinics 
    FOR SELECT 
    USING (
      id = public.get_user_clinic_id()
    );
  END IF;
END $$;

-- Update admin_settings RLS policies only if admin_settings table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_settings') THEN
    DROP POLICY IF EXISTS "Users can view their own settings" ON public.admin_settings;
    DROP POLICY IF EXISTS "Users can insert their own settings" ON public.admin_settings;
    DROP POLICY IF EXISTS "Users can update their own settings" ON public.admin_settings;

    CREATE POLICY "Users can view their own settings" 
    ON public.admin_settings 
    FOR SELECT 
    USING (auth.uid() = user_id OR public.is_super_admin());

    CREATE POLICY "Users can insert their own settings" 
    ON public.admin_settings 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own settings" 
    ON public.admin_settings 
    FOR UPDATE 
    USING (auth.uid() = user_id);
  END IF;
END $$;

