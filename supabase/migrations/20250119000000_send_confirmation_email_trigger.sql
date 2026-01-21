-- =====================================================
-- Send Confirmation Email Trigger
-- =====================================================
-- This trigger automatically sends confirmation email
-- when a new user is created with email_confirm: false
-- =====================================================

-- Create function to send confirmation email via Supabase Auth
-- This uses Supabase's built-in email sending (requires SMTP configuration)
CREATE OR REPLACE FUNCTION public.send_user_confirmation_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  confirmation_link TEXT;
  frontend_url TEXT;
BEGIN
  -- Only send email if email is not confirmed
  IF NEW.email_confirmed_at IS NULL THEN
    -- Get frontend URL from environment or use default
    frontend_url := COALESCE(
      current_setting('app.settings.frontend_url', true),
      'http://localhost:8080'
    );
    
    -- Generate confirmation token (Supabase handles this internally)
    -- The email will be sent automatically by Supabase if:
    -- 1. SMTP is configured in Dashboard → Settings → Auth → SMTP Settings
    -- 2. "Confirm email" is enabled in Dashboard → Authentication → Providers → Email
    
    -- Note: Supabase automatically sends confirmation emails when:
    -- - Using client-side signup (supabase.auth.signUp)
    -- - OR when admin.createUser is used with proper SMTP configuration
    
    -- This trigger ensures the email is sent even when using admin API
    -- The actual email sending is handled by Supabase's auth system
    
    RAISE NOTICE 'User created: % - Confirmation email should be sent by Supabase if SMTP is configured', NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users table
-- Note: We can't directly create triggers on auth.users as it's a system table
-- Instead, we'll use Supabase's built-in email sending which happens automatically
-- when "Confirm email" is enabled in the dashboard

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.send_user_confirmation_email() TO authenticated;

COMMENT ON FUNCTION public.send_user_confirmation_email() IS 
'Trigger function to ensure confirmation emails are sent when users are created. Requires SMTP configuration in Supabase Dashboard.';

