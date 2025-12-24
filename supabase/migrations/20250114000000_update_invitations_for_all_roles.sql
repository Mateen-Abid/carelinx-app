-- =====================================================
-- Update Invitations Table to Support All Roles
-- =====================================================
-- This migration adds role_type column to support
-- both super_admin and clinic_admin invitations
-- =====================================================

-- Add role_type column to invitations table
ALTER TABLE public.super_admin_invitations
ADD COLUMN IF NOT EXISTS role_type TEXT NOT NULL DEFAULT 'super_admin' 
CHECK (role_type IN ('super_admin', 'clinic_admin'));

-- Create index for role_type
CREATE INDEX IF NOT EXISTS idx_super_admin_invitations_role_type 
ON public.super_admin_invitations(role_type);

-- Update the table comment
COMMENT ON COLUMN public.super_admin_invitations.role_type IS 
'Role type to be assigned: super_admin or clinic_admin';

