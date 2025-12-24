-- =====================================================
-- Fix Invitation Status Update RLS Policy
-- =====================================================
-- This ensures users can update invitation status to 'accepted'
-- when they accept the invitation and sign up

-- Drop existing policy
DROP POLICY IF EXISTS "Invited user can accept invitation" ON public.super_admin_invitations;

-- Create improved policy with explicit WITH CHECK clause
-- This allows users to update their own invitation status to 'accepted'
-- by matching their email with the invitation email
CREATE POLICY "Invited user can accept invitation"
ON public.super_admin_invitations
FOR UPDATE
USING (
  -- Allow update if invitation is pending and not expired
  status = 'pending'
  AND expires_at > now()
  -- OR if user's email matches invitation email (for cases where token is lost)
  OR EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND LOWER(email) = LOWER(super_admin_invitations.email)
  )
)
WITH CHECK (
  -- Allow update to 'accepted' status if:
  -- New status is 'accepted' AND user's email matches invitation email
  status = 'accepted'
  AND EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND LOWER(email) = LOWER(super_admin_invitations.email)
  )
);

-- Grant UPDATE permission to authenticated users
GRANT UPDATE ON public.super_admin_invitations TO authenticated;

-- Verify the policy was created
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'super_admin_invitations'
  AND policyname = 'Invited user can accept invitation';

