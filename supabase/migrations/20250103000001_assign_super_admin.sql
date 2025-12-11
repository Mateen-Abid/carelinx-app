-- Assign super_admin role to mateenofficial42@gmail.com
-- This script should be run after the user account exists

-- First, find the user_id for the email
-- Then update their profile role to super_admin

UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'mateenofficial42@gmail.com';

-- Verify the update
SELECT id, email, full_name, role 
FROM public.profiles 
WHERE email = 'mateenofficial42@gmail.com';

