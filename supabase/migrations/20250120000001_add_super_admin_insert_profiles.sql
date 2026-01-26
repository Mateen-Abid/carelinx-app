-- Add INSERT policy for super admin on profiles table
-- This allows super admin to create profiles for other users
-- Note: Service role (supabaseAdmin) should bypass RLS, but this policy ensures it works
-- even if RLS is somehow still enforced

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Super admin can insert profiles" ON public.profiles;

-- Create policy for super admin to insert profiles using the helper function
CREATE POLICY "Super admin can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  -- Allow if user is inserting their own profile
  auth.uid() = user_id OR 
  -- Allow if user is super admin (using helper function)
  public.is_super_admin()
);

-- Create a function to insert profiles that bypasses RLS (for service role)
-- This function runs with SECURITY DEFINER, so it bypasses RLS
CREATE OR REPLACE FUNCTION public.create_profile_for_user(
  p_user_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_gender TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_date_of_birth DATE DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  gender TEXT,
  phone TEXT,
  date_of_birth DATE,
  created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    email,
    full_name,
    gender,
    phone,
    date_of_birth
  ) VALUES (
    p_user_id,
    p_email,
    p_full_name,
    p_gender,
    p_phone,
    p_date_of_birth
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    gender = COALESCE(EXCLUDED.gender, profiles.gender),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    date_of_birth = COALESCE(EXCLUDED.date_of_birth, profiles.date_of_birth),
    updated_at = now();
  
  RETURN QUERY
  SELECT 
    p.user_id,
    p.full_name,
    p.email,
    p.gender,
    p.phone,
    p.date_of_birth,
    p.created_at
  FROM public.profiles p
  WHERE p.user_id = p_user_id;
END;
$$;

