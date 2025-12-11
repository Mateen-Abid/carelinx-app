-- =====================================================
-- Update Team Members Table to Support Access Levels
-- =====================================================

-- Add new columns to team_members table
ALTER TABLE public.team_members 
ADD COLUMN IF NOT EXISTS access_level TEXT CHECK (access_level IN ('super_admin', 'clinic_admin', 'public_user')),
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_access_level ON public.team_members(access_level);

-- Add comment
COMMENT ON COLUMN public.team_members.access_level IS 'System access level: super_admin (admin pages), clinic_admin (clinic admin pages), public_user (booking pages)';
COMMENT ON COLUMN public.team_members.email IS 'Email for creating user account if system access is needed';
COMMENT ON COLUMN public.team_members.user_id IS 'Links to auth.users if team member has system access';

