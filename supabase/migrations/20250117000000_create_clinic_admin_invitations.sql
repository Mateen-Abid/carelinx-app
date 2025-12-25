-- =====================================================
-- Clinic Admin Invitations Table
-- =====================================================
-- This table stores invitations sent to doctors
-- by clinic admins to grant them doctor access
-- =====================================================

-- Create clinic_admin_invitations table
CREATE TABLE IF NOT EXISTS public.clinic_admin_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  invitation_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.clinic_admin_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Clinic admins can view invitations for their clinic
CREATE POLICY "Clinic admins can view their clinic invitations"
ON public.clinic_admin_invitations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clinics
    WHERE id = clinic_admin_invitations.clinic_id
    AND clinic_admin_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role_type = 'super_admin'
    AND is_active = true
  )
);

-- Policy: Clinic admins can create invitations for their clinic
CREATE POLICY "Clinic admins can create invitations"
ON public.clinic_admin_invitations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clinics
    WHERE id = clinic_admin_invitations.clinic_id
    AND clinic_admin_id = auth.uid()
  )
  AND invited_by = auth.uid()
);

-- Policy: Clinic admins can update invitations for their clinic
CREATE POLICY "Clinic admins can update their clinic invitations"
ON public.clinic_admin_invitations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.clinics
    WHERE id = clinic_admin_invitations.clinic_id
    AND clinic_admin_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role_type = 'super_admin'
    AND is_active = true
  )
);

-- Policy: Anyone can view invitation by token (for acceptance page)
CREATE POLICY "Anyone can view invitation by token"
ON public.clinic_admin_invitations
FOR SELECT
USING (true);

-- Policy: Invited user can update their own invitation (when accepting)
CREATE POLICY "Invited user can accept invitation"
ON public.clinic_admin_invitations
FOR UPDATE
USING (
  status = 'pending'
  AND expires_at > now()
)
WITH CHECK (
  status = 'accepted'
  OR status = 'pending'
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_clinic_admin_invitations_token ON public.clinic_admin_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_clinic_admin_invitations_email ON public.clinic_admin_invitations(email);
CREATE INDEX IF NOT EXISTS idx_clinic_admin_invitations_status ON public.clinic_admin_invitations(status);
CREATE INDEX IF NOT EXISTS idx_clinic_admin_invitations_clinic_id ON public.clinic_admin_invitations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_admin_invitations_invited_by ON public.clinic_admin_invitations(invited_by);

-- Create trigger for automatic timestamp updates
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'update_updated_at_column'
    AND pronamespace = 'public'::regnamespace
  ) THEN
    DROP TRIGGER IF EXISTS update_clinic_admin_invitations_updated_at ON public.clinic_admin_invitations;
    CREATE TRIGGER update_clinic_admin_invitations_updated_at
    BEFORE UPDATE ON public.clinic_admin_invitations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- =====================================================
-- Add user_id to doctors table
-- =====================================================
-- Link doctor user account to doctor record

ALTER TABLE public.doctors
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for user_id
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON public.doctors(user_id);

-- Update RLS policy to allow doctors to view their own record
DROP POLICY IF EXISTS "Doctors can view their own record" ON public.doctors;
CREATE POLICY "Doctors can view their own record"
ON public.doctors
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
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

