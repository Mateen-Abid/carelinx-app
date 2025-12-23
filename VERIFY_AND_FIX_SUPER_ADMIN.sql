-- =====================================================
-- Verify and Fix Super Admin Role Assignment
-- =====================================================
-- Run this in Supabase SQL Editor to check and fix the issue
-- =====================================================

-- Step 1: Check if user exists
SELECT 
  'User Check' as step,
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users
WHERE email = 'Saimbasharat987@gmail.com';

-- Step 2: Check current roles for this user
SELECT 
  'Current Roles' as step,
  ur.id,
  ur.user_id,
  ur.role_type,
  ur.is_active,
  ur.created_at,
  ur.updated_at,
  u.email
FROM user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE u.email = 'Saimbasharat987@gmail.com';

-- Step 3: Deactivate any existing active roles (if any)
UPDATE user_roles
SET is_active = false,
    updated_at = now()
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'Saimbasharat987@gmail.com'
)
AND is_active = true
AND role_type != 'super_admin';

-- Step 4: Delete any existing super_admin role (to start fresh)
DELETE FROM user_roles
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'Saimbasharat987@gmail.com'
)
AND role_type = 'super_admin';

-- Step 5: Insert super_admin role
INSERT INTO user_roles (user_id, role_type, is_active, created_at, updated_at)
SELECT 
  u.id,
  'super_admin',
  true,
  now(),
  now()
FROM auth.users u
WHERE u.email = 'Saimbasharat987@gmail.com'
RETURNING *;

-- Step 6: Verify the role was assigned
SELECT 
  'Final Verification' as step,
  u.email,
  ur.role_type,
  ur.is_active,
  ur.created_at,
  ur.updated_at
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
WHERE u.email = 'Saimbasharat987@gmail.com';


