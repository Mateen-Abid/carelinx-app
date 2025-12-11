-- =====================================================
-- Complete Clinic Admin System Database Structure
-- =====================================================
-- This migration creates all necessary tables and updates
-- existing tables to support the clinic admin onboarding flow
-- and dynamic booking system
-- =====================================================

-- =====================================================
-- 1. CREATE CLINICS TABLE (if it doesn't exist)
-- =====================================================
-- Create clinics table first if it doesn't exist

CREATE TABLE IF NOT EXISTS public.clinics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT, -- For clinic admin authentication (optional, can use auth.users)
  address TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  website TEXT,
  logo_url TEXT,
  description TEXT,
  specialties TEXT[], -- Array of specialties
  country TEXT, -- Country field (from Step 1 - Contact Details)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'suspended')),
  plan_type TEXT DEFAULT 'standard' CHECK (plan_type IN ('standard', 'premium', 'enterprise')),
  registration_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  suspended_reason TEXT, -- Reason for suspension
  clinic_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL -- Link to clinic admin user
);

-- Add country field if table exists but column doesn't
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clinics') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clinics' AND column_name = 'country') THEN
      ALTER TABLE public.clinics ADD COLUMN country TEXT;
    END IF;
  END IF;
END $$;

-- Enable Row Level Security (if not already enabled)
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for clinics (drop and recreate to avoid conflicts)
DROP POLICY IF EXISTS "Super admin can view all clinics" ON public.clinics;
DROP POLICY IF EXISTS "Super admin can insert clinics" ON public.clinics;
DROP POLICY IF EXISTS "Super admin can update all clinics" ON public.clinics;
DROP POLICY IF EXISTS "Super admin can delete all clinics" ON public.clinics;
DROP POLICY IF EXISTS "Clinic admin can view their own clinic" ON public.clinics;
DROP POLICY IF EXISTS "Clinic admin can insert their own clinic" ON public.clinics;
DROP POLICY IF EXISTS "Clinic admin can update their own clinic" ON public.clinics;

-- Super admin policies
CREATE POLICY "Super admin can view all clinics" 
ON public.clinics 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'super_admin' 
    AND is_active = true
  )
);

CREATE POLICY "Super admin can insert clinics" 
ON public.clinics 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'super_admin' 
    AND is_active = true
  )
);

CREATE POLICY "Super admin can update all clinics" 
ON public.clinics 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'super_admin' 
    AND is_active = true
  )
);

CREATE POLICY "Super admin can delete all clinics" 
ON public.clinics 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'super_admin' 
    AND is_active = true
  )
);

-- Clinic admin policies
CREATE POLICY "Clinic admin can view their own clinic" 
ON public.clinics 
FOR SELECT 
USING (
  clinic_admin_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'super_admin' 
    AND is_active = true
  )
);

CREATE POLICY "Clinic admin can insert their own clinic" 
ON public.clinics 
FOR INSERT 
WITH CHECK (
  clinic_admin_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'super_admin' 
    AND is_active = true
  )
);

CREATE POLICY "Clinic admin can update their own clinic" 
ON public.clinics 
FOR UPDATE 
USING (
  clinic_admin_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'super_admin' 
    AND is_active = true
  )
);

-- Create trigger for automatic timestamp updates (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_clinics_updated_at') THEN
    CREATE TRIGGER update_clinics_updated_at
    BEFORE UPDATE ON public.clinics
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Create indexes (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_clinics_status ON public.clinics(status);
CREATE INDEX IF NOT EXISTS idx_clinics_email ON public.clinics(email);
CREATE INDEX IF NOT EXISTS idx_clinics_clinic_admin_id ON public.clinics(clinic_admin_id);
CREATE INDEX IF NOT EXISTS idx_clinics_created_at ON public.clinics(created_at DESC);

-- Add comment
COMMENT ON COLUMN public.clinics.country IS 'Country where the clinic is located (from onboarding Step 1)';

-- =====================================================
-- 2. CREATE CLINIC_OPERATING_HOURS TABLE
-- =====================================================
-- Stores operating hours for each clinic (Step 2 of onboarding)

CREATE TABLE IF NOT EXISTS public.clinic_operating_hours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 1=Monday, etc.
  opening_time TIME,
  closing_time TIME,
  is_closed BOOLEAN NOT NULL DEFAULT false, -- If true, clinic is closed on this day
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one entry per clinic per day
  CONSTRAINT unique_clinic_day UNIQUE (clinic_id, day_of_week)
);

-- Enable Row Level Security
ALTER TABLE public.clinic_operating_hours ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Clinic admin can view/edit their own clinic's operating hours
CREATE POLICY "Clinic admin can view their clinic operating hours" 
ON public.clinic_operating_hours 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.clinics 
    WHERE id = clinic_operating_hours.clinic_id 
    AND clinic_admin_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'super_admin' 
    AND is_active = true
  )
);

CREATE POLICY "Clinic admin can insert their clinic operating hours" 
ON public.clinic_operating_hours 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clinics 
    WHERE id = clinic_operating_hours.clinic_id 
    AND clinic_admin_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'super_admin' 
    AND is_active = true
  )
);

CREATE POLICY "Clinic admin can update their clinic operating hours" 
ON public.clinic_operating_hours 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.clinics 
    WHERE id = clinic_operating_hours.clinic_id 
    AND clinic_admin_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'super_admin' 
    AND is_active = true
  )
);

CREATE POLICY "Clinic admin can delete their clinic operating hours" 
ON public.clinic_operating_hours 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.clinics 
    WHERE id = clinic_operating_hours.clinic_id 
    AND clinic_admin_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'super_admin' 
    AND is_active = true
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_clinic_operating_hours_updated_at
BEFORE UPDATE ON public.clinic_operating_hours
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_clinic_operating_hours_clinic_id ON public.clinic_operating_hours(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_operating_hours_day ON public.clinic_operating_hours(day_of_week);

-- =====================================================
-- 3. CREATE DOCTORS TABLE
-- =====================================================
-- Stores doctors for each clinic (managed by clinic admin)

CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  availability TEXT, -- e.g., "9:00 AM - 5:00 PM"
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on-leave')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Clinic admin can view/edit doctors in their clinic
CREATE POLICY "Clinic admin can view their clinic doctors" 
ON public.doctors 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.clinics 
    WHERE id = doctors.clinic_id 
    AND clinic_admin_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'super_admin' 
    AND is_active = true
  )
);

CREATE POLICY "Clinic admin can insert doctors in their clinic" 
ON public.doctors 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clinics 
    WHERE id = doctors.clinic_id 
    AND clinic_admin_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'super_admin' 
    AND is_active = true
  )
);

CREATE POLICY "Clinic admin can update doctors in their clinic" 
ON public.doctors 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.clinics 
    WHERE id = doctors.clinic_id 
    AND clinic_admin_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'super_admin' 
    AND is_active = true
  )
);

CREATE POLICY "Clinic admin can delete doctors in their clinic" 
ON public.doctors 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.clinics 
    WHERE id = doctors.clinic_id 
    AND clinic_admin_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'super_admin' 
    AND is_active = true
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_doctors_updated_at
BEFORE UPDATE ON public.doctors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_doctors_clinic_id ON public.doctors(clinic_id);
CREATE INDEX IF NOT EXISTS idx_doctors_status ON public.doctors(status);
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON public.doctors(specialty);

-- =====================================================
-- 4. UPDATE BOOKINGS TABLE
-- =====================================================
-- Add foreign keys to link bookings to clinics and doctors
-- This makes the system fully dynamic

-- Add clinic_id foreign key (nullable for backward compatibility)
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL;

-- Add doctor_id foreign key (nullable for backward compatibility)
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_clinic_id ON public.bookings(clinic_id);
CREATE INDEX IF NOT EXISTS idx_bookings_doctor_id ON public.bookings(doctor_id);

-- Update RLS policies to allow clinic admins to view bookings for their clinic
-- Drop existing policies first (if they exist)
DROP POLICY IF EXISTS "Clinic admin can view their clinic bookings" ON public.bookings;
DROP POLICY IF EXISTS "Clinic admin can update their clinic bookings" ON public.bookings;

-- Create new policies for clinic admins
CREATE POLICY "Clinic admin can view their clinic bookings" 
ON public.bookings 
FOR SELECT 
USING (
  -- Users can view their own bookings
  auth.uid() = user_id
  OR
  -- Clinic admins can view bookings for their clinic
  EXISTS (
    SELECT 1 FROM public.clinics 
    WHERE id = bookings.clinic_id 
    AND clinic_admin_id = auth.uid()
  )
  OR
  -- Super admins can view all bookings
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'super_admin' 
    AND is_active = true
  )
);

CREATE POLICY "Clinic admin can update their clinic bookings" 
ON public.bookings 
FOR UPDATE 
USING (
  -- Users can update their own bookings
  auth.uid() = user_id
  OR
  -- Clinic admins can update bookings for their clinic
  EXISTS (
    SELECT 1 FROM public.clinics 
    WHERE id = bookings.clinic_id 
    AND clinic_admin_id = auth.uid()
  )
  OR
  -- Super admins can update all bookings
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'super_admin' 
    AND is_active = true
  )
);

-- =====================================================
-- 5. UPDATE USER_ROLES TABLE
-- =====================================================
-- Ensure clinic_id is properly linked when clinic admin completes onboarding

-- The foreign key should already exist from previous migration
-- But let's ensure it's there
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_user_roles_clinic_id' 
    AND table_schema = 'public' 
    AND table_name = 'user_roles'
  ) THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clinics') THEN
      ALTER TABLE public.user_roles 
      ADD CONSTRAINT fk_user_roles_clinic_id 
      FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- =====================================================
-- 6. UPDATE CLINICS RLS POLICIES
-- =====================================================
-- Ensure clinic admins can insert/update their own clinic during onboarding

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Clinic admin can insert their own clinic" ON public.clinics;
DROP POLICY IF EXISTS "Clinic admin can update their own clinic" ON public.clinics;

-- Create policies for clinic admins to create/update their clinic
CREATE POLICY "Clinic admin can insert their own clinic" 
ON public.clinics 
FOR INSERT 
WITH CHECK (
  clinic_admin_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'super_admin' 
    AND is_active = true
  )
);

CREATE POLICY "Clinic admin can update their own clinic" 
ON public.clinics 
FOR UPDATE 
USING (
  clinic_admin_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'super_admin' 
    AND is_active = true
  )
);

-- =====================================================
-- 7. HELPER FUNCTION: Update user_roles.clinic_id when clinic is created
-- =====================================================
-- This automatically links the clinic_admin's user_roles.clinic_id when they create a clinic

CREATE OR REPLACE FUNCTION public.link_clinic_to_user_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user_roles.clinic_id when a clinic is created/updated
  IF NEW.clinic_admin_id IS NOT NULL THEN
    UPDATE public.user_roles
    SET clinic_id = NEW.id,
        updated_at = now()
    WHERE user_id = NEW.clinic_admin_id
      AND role_type = 'clinic_admin';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_link_clinic_to_user_role ON public.clinics;
CREATE TRIGGER trigger_link_clinic_to_user_role
  AFTER INSERT OR UPDATE OF clinic_admin_id ON public.clinics
  FOR EACH ROW
  EXECUTE FUNCTION public.link_clinic_to_user_role();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.clinic_operating_hours IS 'Stores operating hours for each clinic (Step 2 of onboarding)';
COMMENT ON TABLE public.doctors IS 'Stores doctors for each clinic, managed by clinic admin';
COMMENT ON COLUMN public.bookings.clinic_id IS 'Foreign key to clinics table - links booking to specific clinic';
COMMENT ON COLUMN public.bookings.doctor_id IS 'Foreign key to doctors table - links booking to specific doctor';
COMMENT ON COLUMN public.clinics.country IS 'Country where clinic is located (from onboarding Step 1)';

