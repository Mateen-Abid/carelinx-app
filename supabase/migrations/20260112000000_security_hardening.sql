-- ============================================
-- SECURITY HARDENING MIGRATION
-- Adds additional security layers to protect against unauthorized access
-- ============================================

-- ============================================
-- 1. CREATE RATE LIMITING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  requests_count integer DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on rate_limits table
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Only super_admin can manage rate limits
CREATE POLICY "Only super admin can manage rate limits"
ON public.rate_limits
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role_type = 'super_admin'
  )
);

-- Create index for faster rate limit checks
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint ON public.rate_limits(user_id, endpoint, created_at DESC);

-- Add helpful comments
COMMENT ON TABLE public.rate_limits IS 'Tracks API rate limiting per user to prevent abuse';
COMMENT ON COLUMN public.rate_limits.endpoint IS 'API endpoint or action being rate limited';
COMMENT ON COLUMN public.rate_limits.requests_count IS 'Number of requests made within the time window';
COMMENT ON COLUMN public.rate_limits.window_start IS 'Start time of the current rate limit window';

-- ============================================
-- 2. CREATE SECURITY AUDIT LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id text,
  ip_address inet,
  user_agent text,
  success boolean DEFAULT true,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on security audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only super_admin can view audit logs
CREATE POLICY "Only super_admin can view security logs"
ON public.security_audit_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role_type = 'super_admin'
  )
);

-- System can insert audit logs (using service role)
CREATE POLICY "System can insert audit logs"
ON public.security_audit_log
FOR INSERT
WITH CHECK (true);

-- Create index for faster audit log queries
CREATE INDEX IF NOT EXISTS idx_security_audit_user_created ON public.security_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_action ON public.security_audit_log(action, created_at DESC);

-- ============================================
-- 3. ADD RATE LIMITING FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  action_type TEXT,
  max_attempts INTEGER DEFAULT 10,
  time_window_minutes INTEGER DEFAULT 5
)
RETURNS BOOLEAN AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  -- Count recent attempts for this user
  SELECT COUNT(*) INTO attempt_count
  FROM public.rate_limits
  WHERE user_id = auth.uid()
    AND endpoint = action_type
    AND window_start > NOW() - INTERVAL '1 minute' * time_window_minutes;
  
  -- Log the attempt
  IF attempt_count = 0 THEN
    -- First attempt in this window
    INSERT INTO public.rate_limits (user_id, endpoint, requests_count, window_start)
    VALUES (auth.uid(), action_type, 1, NOW());
  ELSE
    -- Increment attempt count
    UPDATE public.rate_limits
    SET requests_count = requests_count + 1,
        updated_at = NOW()
    WHERE user_id = auth.uid()
      AND endpoint = action_type
      AND window_start > NOW() - INTERVAL '1 minute' * time_window_minutes;
  END IF;
  
  -- Return true if under limit, false otherwise
  RETURN attempt_count < max_attempts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helpful comment
COMMENT ON FUNCTION public.check_rate_limit IS 'Checks if user has exceeded rate limit for a specific action';

-- ============================================
-- 4. ADD FUNCTION TO LOG SECURITY EVENTS
-- ============================================
CREATE OR REPLACE FUNCTION public.log_security_event(
  action_type TEXT,
  table_name TEXT,
  record_id TEXT DEFAULT NULL,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    table_name,
    record_id,
    success,
    error_message
  )
  VALUES (
    auth.uid(),
    action_type,
    table_name,
    record_id,
    success,
    error_message
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helpful comment
COMMENT ON FUNCTION public.log_security_event IS 'Logs security-related events for audit purposes';

-- ============================================
-- 5. ADD TRIGGERS TO LOG SENSITIVE OPERATIONS
-- ============================================

-- Log all bookings modifications
CREATE OR REPLACE FUNCTION public.audit_bookings_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_security_event('booking_created', 'bookings', NEW.id::text, true);
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log status changes
    IF OLD.status != NEW.status THEN
      PERFORM public.log_security_event('booking_status_changed', 'bookings', NEW.id::text, true);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_security_event('booking_deleted', 'bookings', OLD.id::text, true);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_bookings_trigger ON public.bookings;
CREATE TRIGGER audit_bookings_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_bookings_changes();

-- Log user role changes
CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_security_event('role_assigned', 'user_roles', NEW.id::text, true);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role_type != NEW.role_type THEN
      PERFORM public.log_security_event('role_changed', 'user_roles', NEW.id::text, true);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_security_event('role_removed', 'user_roles', OLD.id::text, true);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_role_changes_trigger ON public.user_roles;
CREATE TRIGGER audit_role_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_role_changes();

