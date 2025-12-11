-- Fix RLS policies for bookings table to ensure super_admin can access all bookings
-- This fixes potential circular dependency issues

-- Drop existing super_admin policies
DROP POLICY IF EXISTS "Super admin can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Super admin can update all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Super admin can delete all bookings" ON public.bookings;

-- Create a function to check if user is super_admin (avoids circular dependency)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate super_admin policies using the function
CREATE POLICY "Super admin can view all bookings" 
ON public.bookings 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  public.is_super_admin()
);

CREATE POLICY "Super admin can update all bookings" 
ON public.bookings 
FOR UPDATE 
USING (
  auth.uid() = user_id OR 
  public.is_super_admin()
);

CREATE POLICY "Super admin can delete all bookings" 
ON public.bookings 
FOR DELETE 
USING (
  auth.uid() = user_id OR 
  public.is_super_admin()
);

-- Also ensure super_admin can insert bookings (for testing/admin purposes)
DROP POLICY IF EXISTS "Super admin can insert bookings" ON public.bookings;
CREATE POLICY "Super admin can insert bookings" 
ON public.bookings 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id OR 
  public.is_super_admin()
);

