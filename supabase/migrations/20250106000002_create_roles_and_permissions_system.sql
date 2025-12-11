-- =====================================================
-- Professional Roles and Permissions System
-- =====================================================
-- This migration creates a clean, professional database structure
-- for managing user roles and permissions

-- 1. Create user_roles table (more professional than just a column)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role_type TEXT NOT NULL CHECK (role_type IN ('super_admin', 'clinic_admin', 'public_user')),
  clinic_id UUID, -- For clinic_admin, link to their clinic (foreign key added later if clinics table exists)
  is_active BOOLEAN NOT NULL DEFAULT true,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Who assigned this role
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one role per user
  CONSTRAINT unique_user_role UNIQUE (user_id)
);

-- Add foreign key to clinics table if it exists (run this separately after clinics table is created)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clinics') THEN
    ALTER TABLE public.user_roles 
    ADD CONSTRAINT fk_user_roles_clinic_id 
    FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Create role_permissions table (defines what each role can do)
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_type TEXT NOT NULL CHECK (role_type IN ('super_admin', 'clinic_admin', 'public_user')),
  permission_name TEXT NOT NULL,
  permission_description TEXT,
  is_granted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique permission per role
  CONSTRAINT unique_role_permission UNIQUE (role_type, permission_name)
);

-- 3. Enable Row Level Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies for user_roles
-- =====================================================

-- Super admin can view all user roles
CREATE POLICY "Super admin can view all user roles" 
ON public.user_roles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role_type = 'super_admin' AND is_active = true
  )
);

-- Users can view their own role
CREATE POLICY "Users can view their own role" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Super admin can insert user roles
CREATE POLICY "Super admin can insert user roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role_type = 'super_admin' AND is_active = true
  )
);

-- Super admin can update all user roles
CREATE POLICY "Super admin can update all user roles" 
ON public.user_roles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role_type = 'super_admin' AND is_active = true
  )
);

-- Super admin can delete user roles
CREATE POLICY "Super admin can delete user roles" 
ON public.user_roles 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role_type = 'super_admin' AND is_active = true
  )
);

-- =====================================================
-- RLS Policies for role_permissions
-- =====================================================

-- Everyone can view role permissions (read-only for all)
CREATE POLICY "Anyone can view role permissions" 
ON public.role_permissions 
FOR SELECT 
USING (true);

-- Only super admin can manage permissions
CREATE POLICY "Super admin can manage role permissions" 
ON public.role_permissions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role_type = 'super_admin' AND is_active = true
  )
);

-- =====================================================
-- Insert Default Permissions
-- =====================================================

-- Super Admin Permissions (Full Access)
INSERT INTO public.role_permissions (role_type, permission_name, permission_description, is_granted) VALUES
('super_admin', 'view_all_clinics', 'View all clinics in the system', true),
('super_admin', 'manage_all_clinics', 'Create, update, and delete any clinic', true),
('super_admin', 'view_all_appointments', 'View all appointments across all clinics', true),
('super_admin', 'manage_all_appointments', 'Approve, cancel, or modify any appointment', true),
('super_admin', 'view_all_doctors', 'View all doctors across all clinics', true),
('super_admin', 'view_all_patients', 'View all patients across all clinics', true),
('super_admin', 'manage_team_members', 'Add, edit, and remove team members', true),
('super_admin', 'manage_settings', 'Modify system-wide settings', true),
('super_admin', 'manage_user_roles', 'Assign and modify user roles', true),
('super_admin', 'view_analytics', 'Access all analytics and reports', true)
ON CONFLICT (role_type, permission_name) DO NOTHING;

-- Clinic Admin Permissions (Clinic-Specific Access)
INSERT INTO public.role_permissions (role_type, permission_name, permission_description, is_granted) VALUES
('clinic_admin', 'view_own_clinic', 'View their assigned clinic details', true),
('clinic_admin', 'manage_own_clinic', 'Update their clinic information', true),
('clinic_admin', 'view_clinic_appointments', 'View appointments for their clinic', true),
('clinic_admin', 'manage_clinic_appointments', 'Approve, cancel, or modify appointments for their clinic', true),
('clinic_admin', 'view_clinic_doctors', 'View doctors in their clinic', true),
('clinic_admin', 'view_clinic_patients', 'View patients who booked at their clinic', true),
('clinic_admin', 'manage_clinic_settings', 'Modify settings for their clinic', true),
('clinic_admin', 'view_clinic_analytics', 'Access analytics for their clinic', true)
ON CONFLICT (role_type, permission_name) DO NOTHING;

-- Public User Permissions (Normal Access)
INSERT INTO public.role_permissions (role_type, permission_name, permission_description, is_granted) VALUES
('public_user', 'view_available_clinics', 'View list of available clinics', true),
('public_user', 'view_clinic_details', 'View details of clinics', true),
('public_user', 'book_appointment', 'Book appointments at clinics', true),
('public_user', 'view_own_appointments', 'View their own appointments', true),
('public_user', 'cancel_own_appointments', 'Cancel their own appointments', true),
('public_user', 'update_own_profile', 'Update their own profile information', true),
('public_user', 'view_own_bookings', 'View their booking history', true)
ON CONFLICT (role_type, permission_name) DO NOTHING;

-- =====================================================
-- Migrate existing roles from profiles to user_roles
-- =====================================================

-- Migrate super_admin roles
INSERT INTO public.user_roles (user_id, role_type, is_active)
SELECT user_id, 'super_admin', true
FROM public.profiles
WHERE role = 'super_admin'
ON CONFLICT (user_id) DO NOTHING;

-- Migrate clinic_admin roles
INSERT INTO public.user_roles (user_id, role_type, is_active)
SELECT user_id, 'clinic_admin', true
FROM public.profiles
WHERE role = 'clinic_admin'
ON CONFLICT (user_id) DO NOTHING;

-- Migrate patient roles to public_user
INSERT INTO public.user_roles (user_id, role_type, is_active)
SELECT user_id, 'public_user', true
FROM public.profiles
WHERE role = 'patient' OR role IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- Create Helper Functions
-- =====================================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(check_user_id UUID, check_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id 
    AND role_type = check_role 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has a specific permission
CREATE OR REPLACE FUNCTION public.has_permission(check_user_id UUID, check_permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get user's role
  SELECT role_type INTO user_role
  FROM public.user_roles
  WHERE user_id = check_user_id AND is_active = true;
  
  -- Check if permission exists for this role
  RETURN EXISTS (
    SELECT 1 FROM public.role_permissions
    WHERE role_type = user_role
    AND permission_name = check_permission
    AND is_granted = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(check_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role_type INTO user_role
  FROM public.user_roles
  WHERE user_id = check_user_id AND is_active = true;
  
  RETURN COALESCE(user_role, 'public_user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Create Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_type ON public.user_roles(role_type);
CREATE INDEX IF NOT EXISTS idx_user_roles_clinic_id ON public.user_roles(clinic_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_is_active ON public.user_roles(is_active);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_type ON public.role_permissions(role_type);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_name ON public.role_permissions(permission_name);

-- =====================================================
-- Create Triggers
-- =====================================================

-- Trigger for automatic timestamp updates on user_roles
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for automatic timestamp updates on role_permissions
CREATE TRIGGER update_role_permissions_updated_at
BEFORE UPDATE ON public.role_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Add Comments for Documentation
-- =====================================================

COMMENT ON TABLE public.user_roles IS 'Stores user role assignments. Each user has one active role: super_admin, clinic_admin, or public_user';
COMMENT ON TABLE public.role_permissions IS 'Defines permissions for each role type. Used to control access throughout the application';
COMMENT ON COLUMN public.user_roles.clinic_id IS 'For clinic_admin role, links to their assigned clinic. NULL for super_admin and public_user';
COMMENT ON COLUMN public.user_roles.is_active IS 'Allows deactivating a role without deleting it';

