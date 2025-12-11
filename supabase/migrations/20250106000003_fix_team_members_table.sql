-- =====================================================
-- Fix Team Members Table
-- =====================================================
-- This ensures the team_members table exists and has proper RLS

-- Drop table if exists and recreate (to fix any issues)
DROP TABLE IF EXISTS public.team_members CASCADE;

-- Create team_members table
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on-leave')),
  permissions TEXT NOT NULL DEFAULT 'Limited Access' CHECK (permissions IN ('Full Access', 'Limited Access')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Super admin can view all team members" ON public.team_members;
DROP POLICY IF EXISTS "Super admin can insert team members" ON public.team_members;
DROP POLICY IF EXISTS "Super admin can update all team members" ON public.team_members;
DROP POLICY IF EXISTS "Super admin can delete all team members" ON public.team_members;

-- Create policies using the new user_roles table
CREATE POLICY "Super admin can view all team members" 
ON public.team_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role_type = 'super_admin' AND is_active = true
  )
);

CREATE POLICY "Super admin can insert team members" 
ON public.team_members 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role_type = 'super_admin' AND is_active = true
  )
);

CREATE POLICY "Super admin can update all team members" 
ON public.team_members 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role_type = 'super_admin' AND is_active = true
  )
);

CREATE POLICY "Super admin can delete all team members" 
ON public.team_members 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role_type = 'super_admin' AND is_active = true
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_team_members_status ON public.team_members(status);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON public.team_members(role);

-- Add comment
COMMENT ON TABLE public.team_members IS 'Stores team members managed by super admin. These are internal staff members, not user accounts.';

