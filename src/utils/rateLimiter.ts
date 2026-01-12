import { supabase } from '@/integrations/supabase/client';

/**
 * Rate Limiter Utility
 * 
 * Checks if the current user has exceeded the rate limit for a specific action.
 * This helps prevent API abuse and brute force attacks.
 * 
 * @param action - The action type being rate limited (e.g., 'create_booking', 'login_attempt')
 * @param maxAttempts - Maximum number of attempts allowed (default: 10)
 * @param timeWindowMinutes - Time window in minutes (default: 5)
 * @returns Promise<boolean> - true if under limit, false if rate limit exceeded
 */
export const checkRateLimit = async (
  action: string,
  maxAttempts: number = 10,
  timeWindowMinutes: number = 5
): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      action_type: action,
      max_attempts: maxAttempts,
      time_window_minutes: timeWindowMinutes
    });

    if (error) {
      console.error('Rate limit check failed:', error);
      // In case of error, allow the action (fail open)
      // You can change this to 'fail closed' (return false) for stricter security
      return true;
    }

    return data as boolean;
  } catch (error) {
    console.error('Rate limit check exception:', error);
    // Fail open - allow in case of error
    return true;
  }
};

/**
 * Log a security event
 * 
 * @param action - The action type (e.g., 'login_attempt', 'booking_created')
 * @param tableName - The table being affected
 * @param recordId - Optional record ID
 * @param success - Whether the action was successful
 * @param errorMessage - Optional error message if action failed
 */
export const logSecurityEvent = async (
  action: string,
  tableName: string,
  recordId?: string,
  success: boolean = true,
  errorMessage?: string
): Promise<void> => {
  try {
    await supabase.rpc('log_security_event', {
      action_type: action,
      table_name: tableName,
      record_id: recordId,
      success,
      error_message: errorMessage
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
    // Don't throw - logging failure shouldn't break the app
  }
};

/**
 * Rate limit configurations for different actions
 */
export const RATE_LIMITS = {
  // Authentication
  LOGIN_ATTEMPT: { action: 'login_attempt', maxAttempts: 5, timeWindow: 15 },
  SIGNUP_ATTEMPT: { action: 'signup_attempt', maxAttempts: 3, timeWindow: 60 },
  PASSWORD_RESET: { action: 'password_reset', maxAttempts: 3, timeWindow: 60 },
  
  // Booking operations
  CREATE_BOOKING: { action: 'create_booking', maxAttempts: 5, timeWindow: 10 },
  CANCEL_BOOKING: { action: 'cancel_booking', maxAttempts: 10, timeWindow: 10 },
  
  // Data export
  EXPORT_DATA: { action: 'export_data', maxAttempts: 5, timeWindow: 5 },
  
  // Profile updates
  UPDATE_PROFILE: { action: 'update_profile', maxAttempts: 10, timeWindow: 5 },
  
  // Admin operations
  CREATE_CLINIC: { action: 'create_clinic', maxAttempts: 5, timeWindow: 10 },
  UPDATE_USER_ROLE: { action: 'update_user_role', maxAttempts: 10, timeWindow: 10 },
  SEND_INVITATION: { action: 'send_invitation', maxAttempts: 10, timeWindow: 10 },
} as const;

/**
 * Check rate limit with predefined configuration
 * 
 * @param rateLimitConfig - Configuration from RATE_LIMITS constant
 * @returns Promise<boolean> - true if under limit, false if rate limit exceeded
 */
export const checkRateLimitWithConfig = async (
  rateLimitConfig: typeof RATE_LIMITS[keyof typeof RATE_LIMITS]
): Promise<boolean> => {
  return checkRateLimit(
    rateLimitConfig.action,
    rateLimitConfig.maxAttempts,
    rateLimitConfig.timeWindow
  );
};

