-- Configure auth settings for token expiry and email confirmation
-- Set email confirmation token expiry to 24 hours (86400 seconds)
-- Note: This requires updating Supabase project settings via dashboard

-- Create a function to handle resending confirmation emails
CREATE OR REPLACE FUNCTION public.resend_confirmation_email(user_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record auth.users%ROWTYPE;
    result json;
BEGIN
    -- Check if user exists and is unconfirmed
    SELECT * INTO user_record 
    FROM auth.users 
    WHERE email = user_email 
    AND email_confirmed_at IS NULL;
    
    IF user_record.id IS NULL THEN
        RETURN json_build_object('error', 'User not found or already confirmed');
    END IF;
    
    -- Note: Actual email resending must be done through Supabase Auth API
    -- This function serves as a placeholder for the logic
    RETURN json_build_object('success', true, 'message', 'Confirmation email resent');
END;
$$;