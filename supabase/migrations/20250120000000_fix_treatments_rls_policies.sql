-- =====================================================
-- Fix RLS Policies for Treatments Table
-- =====================================================
-- This migration ensures clinic admins can create, read, update, and delete
-- treatments for their clinic, and that service role can bypass RLS

-- First, ensure the treatments table exists with the correct structure
CREATE TABLE IF NOT EXISTS public.treatments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price TEXT,
  specialty TEXT,
  service TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Clinic admin can view their clinic treatments" ON public.treatments;
DROP POLICY IF EXISTS "Clinic admin can insert their clinic treatments" ON public.treatments;
DROP POLICY IF EXISTS "Clinic admin can update their clinic treatments" ON public.treatments;
DROP POLICY IF EXISTS "Clinic admin can delete their clinic treatments" ON public.treatments;
DROP POLICY IF EXISTS "Service role bypass for treatments" ON public.treatments;

-- Create policies for clinic admins to manage treatments
CREATE POLICY "Clinic admin can view their clinic treatments" 
ON public.treatments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.clinics 
    WHERE id = treatments.clinic_id 
    AND clinic_admin_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'super_admin' 
    AND is_active = true
  )
);

CREATE POLICY "Clinic admin can insert their clinic treatments" 
ON public.treatments 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clinics 
    WHERE id = treatments.clinic_id 
    AND clinic_admin_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'super_admin' 
    AND is_active = true
  )
);

CREATE POLICY "Clinic admin can update their clinic treatments" 
ON public.treatments 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.clinics 
    WHERE id = treatments.clinic_id 
    AND clinic_admin_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'super_admin' 
    AND is_active = true
  )
);

CREATE POLICY "Clinic admin can delete their clinic treatments" 
ON public.treatments 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.clinics 
    WHERE id = treatments.clinic_id 
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
DROP TRIGGER IF EXISTS update_treatments_updated_at ON public.treatments;
CREATE TRIGGER update_treatments_updated_at
BEFORE UPDATE ON public.treatments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_treatments_clinic_id ON public.treatments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_treatments_status ON public.treatments(status);

COMMENT ON TABLE public.treatments IS 'Treatments/services offered by clinics';
COMMENT ON COLUMN public.treatments.clinic_id IS 'Foreign key to clinics table';
COMMENT ON COLUMN public.treatments.status IS 'Treatment status: active or inactive';

