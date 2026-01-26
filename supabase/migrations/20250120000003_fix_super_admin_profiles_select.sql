-- Fix super admin SELECT policies for profiles and bookings tables
-- Ensure super admin can view all data using the is_super_admin() helper function
-- This migration fixes the issue where super admin cannot see patients/appointments

-- ============================================
-- PROFILES TABLE - Ensure super admin can view all profiles
-- ============================================

-- Drop and recreate the super admin SELECT policy using the helper function
DROP POLICY IF EXISTS "Super admin can view all profiles" ON public.profiles;
CREATE POLICY "Super admin can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can always view their own profile
  auth.uid() = user_id OR 
  -- Super admin can view all profiles (using helper function from user_roles table)
  public.is_super_admin()
);

-- ============================================
-- BOOKINGS TABLE - Ensure super admin can view all bookings
-- ============================================

-- Drop and recreate the super admin SELECT policy for bookings
DROP POLICY IF EXISTS "Super admin can view all bookings" ON public.bookings;
CREATE POLICY "Super admin can view all bookings" 
ON public.bookings 
FOR SELECT 
USING (
  -- Users can always view their own bookings
  auth.uid() = user_id OR 
  -- Super admin can view all bookings (using helper function from user_roles table)
  public.is_super_admin()
);

-- Note: PostgreSQL RLS uses OR logic between policies, so multiple policies can grant access
-- The backend uses supabaseAdmin (service role) which bypasses RLS, but these policies
-- ensure direct database access works correctly for super admin users

