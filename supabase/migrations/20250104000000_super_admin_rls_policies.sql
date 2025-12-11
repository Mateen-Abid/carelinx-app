-- Update RLS policies to allow super_admin to view all data

-- ============================================
-- PROFILES TABLE - Allow super_admin to view all profiles
-- ============================================
DROP POLICY IF EXISTS "Super admin can view all profiles" ON public.profiles;
CREATE POLICY "Super admin can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

DROP POLICY IF EXISTS "Super admin can update all profiles" ON public.profiles;
CREATE POLICY "Super admin can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- ============================================
-- BOOKINGS TABLE - Allow super_admin to view all bookings
-- ============================================
DROP POLICY IF EXISTS "Super admin can view all bookings" ON public.bookings;
CREATE POLICY "Super admin can view all bookings" 
ON public.bookings 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

DROP POLICY IF EXISTS "Super admin can update all bookings" ON public.bookings;
CREATE POLICY "Super admin can update all bookings" 
ON public.bookings 
FOR UPDATE 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

DROP POLICY IF EXISTS "Super admin can delete all bookings" ON public.bookings;
CREATE POLICY "Super admin can delete all bookings" 
ON public.bookings 
FOR DELETE 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- ============================================
-- FEEDBACK TABLE - Allow super_admin to view all feedback
-- ============================================
DROP POLICY IF EXISTS "Super admin can view all feedback" ON public.feedback;
CREATE POLICY "Super admin can view all feedback" 
ON public.feedback 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

DROP POLICY IF EXISTS "Super admin can update all feedback" ON public.feedback;
CREATE POLICY "Super admin can update all feedback" 
ON public.feedback 
FOR UPDATE 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

DROP POLICY IF EXISTS "Super admin can delete all feedback" ON public.feedback;
CREATE POLICY "Super admin can delete all feedback" 
ON public.feedback 
FOR DELETE 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

