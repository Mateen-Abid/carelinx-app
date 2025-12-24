-- =====================================================
-- Fix user_roles RLS Policy for Users to View Own Role
-- =====================================================
-- This ensures users can read their own role from user_roles table
-- Fixes 406 error when fetching user role after invitation signup
-- =====================================================

-- Drop ALL existing policies on user_roles to start fresh
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Super admin can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admin can insert user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admin can update all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admin can delete user roles" ON public.user_roles;

-- CRITICAL: Users MUST be able to view their own role
-- This is the most important policy for role-based access
CREATE POLICY "Users can view their own role" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

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

-- Users can insert their own role (needed for invitation signup)
-- This allows users to insert their role when accepting invitation
CREATE POLICY "Users can insert their own role" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

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

-- Grant necessary permissions
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO service_role;

-- Verify the critical policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_roles' 
    AND policyname = 'Users can view their own role'
  ) THEN
    RAISE EXCEPTION 'Policy "Users can view their own role" was not created successfully';
  END IF;
END $$;

COMMENT ON POLICY "Users can view their own role" ON public.user_roles IS 
'CRITICAL: Allows authenticated users to view their own role from user_roles table. Required for role-based access control.';

