-- =====================================================
-- Migrate Existing Roles from profiles.role to user_roles
-- =====================================================
-- This migration ensures all existing users with roles in profiles.role
-- get their roles migrated to user_roles table
-- =====================================================

-- Step 1: Migrate super_admin roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role_type, is_active, assigned_at)
SELECT 
  user_id, 
  'super_admin', 
  true, 
  COALESCE(updated_at, created_at, now())
FROM public.profiles
WHERE role = 'super_admin'
  AND user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = profiles.user_id
  )
ON CONFLICT (user_id) DO NOTHING;

-- Step 2: Migrate clinic_admin roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role_type, is_active, assigned_at)
SELECT 
  user_id, 
  'clinic_admin', 
  true, 
  COALESCE(updated_at, created_at, now())
FROM public.profiles
WHERE role = 'clinic_admin'
  AND user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = profiles.user_id
  )
ON CONFLICT (user_id) DO NOTHING;

-- Step 3: Migrate patient roles to public_user in user_roles
INSERT INTO public.user_roles (user_id, role_type, is_active, assigned_at)
SELECT 
  user_id, 
  'public_user', 
  true, 
  COALESCE(updated_at, created_at, now())
FROM public.profiles
WHERE (role = 'patient' OR role IS NULL)
  AND user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = profiles.user_id
  )
ON CONFLICT (user_id) DO NOTHING;

-- Step 4: Verify migration
-- This query will show all users with their roles
SELECT 
  u.id as user_id,
  u.email,
  p.role as profile_role,
  ur.role_type as user_role_type,
  ur.is_active,
  CASE 
    WHEN ur.role_type IS NULL THEN '❌ Missing in user_roles'
    WHEN p.role = 'super_admin' AND ur.role_type != 'super_admin' THEN '⚠️ Mismatch'
    WHEN p.role = 'clinic_admin' AND ur.role_type != 'clinic_admin' THEN '⚠️ Mismatch'
    ELSE '✅ OK'
  END as status
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE p.role IN ('super_admin', 'clinic_admin')
   OR ur.role_type IN ('super_admin', 'clinic_admin')
ORDER BY u.created_at DESC;

-- Summary
DO $$
DECLARE
  super_admin_count INTEGER;
  clinic_admin_count INTEGER;
  public_user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO super_admin_count FROM public.user_roles WHERE role_type = 'super_admin' AND is_active = true;
  SELECT COUNT(*) INTO clinic_admin_count FROM public.user_roles WHERE role_type = 'clinic_admin' AND is_active = true;
  SELECT COUNT(*) INTO public_user_count FROM public.user_roles WHERE role_type = 'public_user' AND is_active = true;
  
  RAISE NOTICE 'Migration Summary:';
  RAISE NOTICE 'Super Admins: %', super_admin_count;
  RAISE NOTICE 'Clinic Admins: %', clinic_admin_count;
  RAISE NOTICE 'Public Users: %', public_user_count;
END $$;

