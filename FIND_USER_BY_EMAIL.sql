-- =====================================================
-- Find User by Email (Case-Insensitive)
-- =====================================================
-- Run this first to find the exact email in database
-- =====================================================

-- Search for user (case-insensitive)
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
WHERE LOWER(email) = LOWER('Saimbasharat987@gmail.com')
   OR email ILIKE '%saimbasharat987%'
ORDER BY created_at DESC;

-- If user found, use the EXACT email from above query in the next script


