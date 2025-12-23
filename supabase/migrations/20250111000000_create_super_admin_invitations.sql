-- =====================================================
-- Super Admin Invitations Table
-- =====================================================
-- This table stores invitations sent to clients/users
-- by super admins to grant them super_admin access
-- =====================================================

-- Drop table if it exists to ensure a clean slate for re-running migration
DROP TABLE IF EXISTS public.super_admin_invitations CASCADE;

-- Create super_admin_invitations table
CREATE TABLE IF NOT EXISTS public.super_admin_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  invitation_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.super_admin_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Super admins can view all invitations" ON public.super_admin_invitations;
DROP POLICY IF EXISTS "Super admins can create invitations" ON public.super_admin_invitations;
DROP POLICY IF EXISTS "Super admins can update invitations" ON public.super_admin_invitations;
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.super_admin_invitations;
DROP POLICY IF EXISTS "Invited user can accept invitation" ON public.super_admin_invitations;

-- Policy: Super admins can view all invitations
CREATE POLICY "Super admins can view all invitations"
ON public.super_admin_invitations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role_type = 'super_admin'
    AND is_active = true
  )
);

-- Policy: Super admins can create invitations
CREATE POLICY "Super admins can create invitations"
ON public.super_admin_invitations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role_type = 'super_admin'
    AND is_active = true
  )
  AND invited_by = auth.uid()
);

-- Policy: Super admins can update invitations
CREATE POLICY "Super admins can update invitations"
ON public.super_admin_invitations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role_type = 'super_admin'
    AND is_active = true
  )
);

-- Policy: Anyone can view invitation by token (for acceptance page)
CREATE POLICY "Anyone can view invitation by token"
ON public.super_admin_invitations
FOR SELECT
USING (true);

-- Policy: Invited user can update their own invitation (when accepting)
CREATE POLICY "Invited user can accept invitation"
ON public.super_admin_invitations
FOR UPDATE
USING (
  status = 'pending'
  AND expires_at > now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_super_admin_invitations_token ON public.super_admin_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_super_admin_invitations_email ON public.super_admin_invitations(email);
CREATE INDEX IF NOT EXISTS idx_super_admin_invitations_status ON public.super_admin_invitations(status);
CREATE INDEX IF NOT EXISTS idx_super_admin_invitations_invited_by ON public.super_admin_invitations(invited_by);

-- Create trigger for automatic timestamp updates (only if function exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'update_updated_at_column' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    DROP TRIGGER IF EXISTS update_super_admin_invitations_updated_at ON public.super_admin_invitations;
    CREATE TRIGGER update_super_admin_invitations_updated_at
    BEFORE UPDATE ON public.super_admin_invitations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

