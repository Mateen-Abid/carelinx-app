-- =====================================================
-- Fix: Assign Super Admin Role (Case-Insensitive Email Search)
-- =====================================================
-- This handles case sensitivity issues with email
-- =====================================================

DO $$
DECLARE
  target_email TEXT := 'Saimbasharat987@gmail.com';
  user_uuid UUID;
  actual_email TEXT;
  role_count INTEGER;
BEGIN
  -- Step 1: Find user (case-insensitive search)
  SELECT id, email INTO user_uuid, actual_email
  FROM auth.users
  WHERE LOWER(email) = LOWER(target_email);

  IF user_uuid IS NULL THEN
    -- Try to find similar emails
    RAISE NOTICE 'User not found with exact email. Searching for similar emails...';
    SELECT id, email INTO user_uuid, actual_email
    FROM auth.users
    WHERE email ILIKE '%saimbasharat987%'
    LIMIT 1;
  END IF;

  IF user_uuid IS NULL THEN
    RAISE EXCEPTION '❌ User with email % not found. Please check the exact email in Authentication > Users section.', target_email;
  END IF;

  RAISE NOTICE '✅ Found user: % (ID: %)', actual_email, user_uuid;

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
  VALUES (user_uuid, 'super_admin', true, now(), now());

  RAISE NOTICE '✅ Super admin role assigned successfully to: %', actual_email;
  RAISE NOTICE '📋 User must logout and login again to see the changes.';

END $$;

-- Verification Query (shows the actual email in database)
SELECT 
  'Verification' as status,
  u.id as user_id,
  u.email as actual_email,
  ur.role_type,
  ur.is_active,
  ur.created_at
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
WHERE LOWER(u.email) = LOWER('Saimbasharat987@gmail.com')
   OR u.email ILIKE '%saimbasharat987%';


