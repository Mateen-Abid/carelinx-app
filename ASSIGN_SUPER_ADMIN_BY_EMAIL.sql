-- =====================================================
-- Assign Super Admin Role by Email
-- =====================================================
-- This script assigns super_admin role to a user by their email address
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Find the user by email
-- Replace 'Saimbasharat456@gmail.com' with the actual email if needed
DO $$
DECLARE
  target_email TEXT := 'Saimbasharat456@gmail.com';
  user_uuid UUID;
  existing_role RECORD;
BEGIN
  -- Find user ID by email
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = target_email;

  -- Check if user exists
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'User with email % not found. Please make sure the user has signed up first.', target_email;
  END IF;

  RAISE NOTICE 'Found user ID: % for email: %', user_uuid, target_email;

  -- Check if user already has a role
  SELECT * INTO existing_role
  FROM user_roles
  WHERE user_id = user_uuid
  AND is_active = true
  LIMIT 1;

  -- If user has an existing active role, deactivate it first
  IF existing_role IS NOT NULL THEN
    UPDATE user_roles
    SET is_active = false,
        updated_at = now()
    WHERE user_id = user_uuid
    AND is_active = true;
    
    RAISE NOTICE 'Deactivated existing role for user: %', user_uuid;
  END IF;

  -- Check if super_admin role already exists (even if inactive)
  SELECT * INTO existing_role
  FROM user_roles
  WHERE user_id = user_uuid
  AND role_type = 'super_admin'
  LIMIT 1;

  IF existing_role IS NOT NULL THEN
    -- Reactivate the existing super_admin role
    UPDATE user_roles
    SET is_active = true,
        updated_at = now()
    WHERE user_id = user_uuid
    AND role_type = 'super_admin';
    
    RAISE NOTICE 'Reactivated super_admin role for user: %', user_uuid;
  ELSE
    -- Insert new super_admin role
    INSERT INTO user_roles (user_id, role_type, is_active, created_at, updated_at)
    VALUES (user_uuid, 'super_admin', true, now(), now());
    
    RAISE NOTICE 'Created new super_admin role for user: %', user_uuid;
  END IF;

  RAISE NOTICE '✅ Successfully assigned super_admin role to: %', target_email;
END $$;

-- =====================================================
-- Verification Query (Optional - Run separately to verify)
-- =====================================================
-- Uncomment and run this to verify the role was assigned:

/*
SELECT 
  u.email,
  ur.role_type,
  ur.is_active,
  ur.created_at,
  ur.updated_at
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
WHERE u.email = 'Saimbasharat456@gmail.com';
*/


