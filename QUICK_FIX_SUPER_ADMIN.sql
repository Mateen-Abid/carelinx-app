-- =====================================================
-- Quick Fix: Assign Super Admin Role
-- =====================================================
-- Run this if the user exists but role is not assigned
-- =====================================================

DO $$
DECLARE
  target_email TEXT := 'Saimbasharat987@gmail.com';
  user_uuid UUID;
  role_count INTEGER;
BEGIN
  -- Step 1: Find user
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = target_email;

  IF user_uuid IS NULL THEN
    RAISE EXCEPTION '❌ User with email % not found. User must sign up first!', target_email;
  END IF;

  RAISE NOTICE '✅ Found user: % (ID: %)', target_email, user_uuid;

  -- Step 2: Deactivate all existing active roles
  UPDATE user_roles
  SET is_active = false,
      updated_at = now()
  WHERE user_id = user_uuid
  AND is_active = true;

  GET DIAGNOSTICS role_count = ROW_COUNT;
  IF role_count > 0 THEN
    RAISE NOTICE '⚠️ Deactivated % existing role(s)', role_count;
  END IF;

  -- Step 3: Delete any existing super_admin role (clean slate)
  DELETE FROM user_roles
  WHERE user_id = user_uuid
  AND role_type = 'super_admin';

  -- Step 4: Insert new super_admin role
  INSERT INTO user_roles (user_id, role_type, is_active, created_at, updated_at)
  VALUES (user_uuid, 'super_admin', true, now(), now())
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '✅ Super admin role assigned successfully!';
  RAISE NOTICE '📋 User must logout and login again to see the changes.';

END $$;

-- Verification Query
SELECT 
  u.email,
  ur.role_type,
  ur.is_active,
  ur.created_at
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
WHERE u.email = 'Saimbasharat987@gmail.com';


