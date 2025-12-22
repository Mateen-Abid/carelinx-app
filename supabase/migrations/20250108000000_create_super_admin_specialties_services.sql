-- =====================================================
-- Super Admin Managed Specialties and Services
-- =====================================================
-- This migration creates tables for super admin to manage
-- specialties and services that clinic admins can use
-- =====================================================

-- =====================================================
-- 1. CREATE SUPER_ADMIN_SPECIALTIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.super_admin_specialties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable Row Level Security
ALTER TABLE public.super_admin_specialties ENABLE ROW LEVEL SECURITY;

-- Create policies - only super admin can manage
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

CREATE POLICY "Super admin can insert specialties" 
ON public.super_admin_specialties 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'super_admin' 
    AND is_active = true
  )
);

CREATE POLICY "Super admin can update specialties" 
ON public.super_admin_specialties 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'super_admin' 
    AND is_active = true
  )
);

CREATE POLICY "Super admin can delete specialties" 
ON public.super_admin_specialties 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'super_admin' 
    AND is_active = true
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_super_admin_specialties_updated_at
BEFORE UPDATE ON public.super_admin_specialties
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index
CREATE INDEX IF NOT EXISTS idx_super_admin_specialties_active ON public.super_admin_specialties(is_active);

-- =====================================================
-- 2. CREATE SUPER_ADMIN_SERVICES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.super_admin_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  specialty_id UUID NOT NULL REFERENCES public.super_admin_specialties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Ensure unique service name per specialty
  CONSTRAINT unique_service_per_specialty UNIQUE (specialty_id, name)
);

-- Enable Row Level Security
ALTER TABLE public.super_admin_services ENABLE ROW LEVEL SECURITY;

-- Create policies - only super admin can manage
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

CREATE POLICY "Super admin can insert services" 
ON public.super_admin_services 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'super_admin' 
    AND is_active = true
  )
);

CREATE POLICY "Super admin can update services" 
ON public.super_admin_services 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'super_admin' 
    AND is_active = true
  )
);

CREATE POLICY "Super admin can delete services" 
ON public.super_admin_services 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'super_admin' 
    AND is_active = true
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_super_admin_services_updated_at
BEFORE UPDATE ON public.super_admin_services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_super_admin_services_specialty_id ON public.super_admin_services(specialty_id);
CREATE INDEX IF NOT EXISTS idx_super_admin_services_active ON public.super_admin_services(is_active);

