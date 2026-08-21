import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { createClient } from '@supabase/supabase-js';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * POST /api/auth/signin
 * 
 * Login endpoint that:
 * 1. Validates credentials with Supabase
 * 2. Sets JWT in httpOnly cookie (HIDDEN from frontend JavaScript)
 * 3. Returns user data (WITHOUT tokens)
 * 
 * Frontend network tab will show:
 * ✅ POST /api/auth/signin
 * ✅ Cookie: access_token=xxx (httpOnly, secure)
 * ❌ NO apikey visible
 * ❌ NO authorization header visible
 */
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Signin attempt:', email);

    // Call Supabase on backend (credentials never exposed to frontend)
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log('❌ Signin failed:', error.message);
      
      // Check if error is due to unconfirmed email
      if (error.message?.includes('Email not confirmed') || 
          error.message?.includes('email_not_confirmed') ||
          error.message?.includes('Email not confirmed')) {
        // Get user to check email confirmation status
        try {
          const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
          const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
          
          if (user && !user.email_confirmed_at) {
            return res.status(400).json({ 
              error: 'Email not confirmed',
              code: 'email_not_confirmed',
              message: 'Please check your email and click the confirmation link before signing in.'
            });
          }
        } catch (checkError) {
          // Continue with original error
        }
      }
      
      throw error;
    }
    
    // Check if email is confirmed
    if (data.user && !data.user.email_confirmed_at) {
      return res.status(400).json({ 
        error: 'Email not confirmed',
        code: 'email_not_confirmed',
        message: 'Please check your email and click the confirmation link before signing in.'
      });
    }

    console.log('✅ Signin successful:', email);

    // Cookie security: Use COOKIE_SECURE env var, default to false for HTTP deployments
    // Set COOKIE_SECURE=true only if using HTTPS
    const cookieSecure = process.env.COOKIE_SECURE === 'true';
    
    console.log('🍪 Setting cookies:', {
      secure: cookieSecure,
      httpOnly: true,
      sameSite: 'lax',
      domain: process.env.COOKIE_DOMAIN || 'undefined (default)',
    });

    // Set JWT in httpOnly cookie (JavaScript can't access it!)
    const cookieOptions: any = {
      httpOnly: true, // Frontend JavaScript CANNOT read this
      secure: cookieSecure, // Only true if COOKIE_SECURE=true (for HTTPS)
      sameSite: 'lax' as const,
      maxAge: 3600000, // 1 hour
    };

    // Set domain if specified (useful for subdomains)
    if (process.env.COOKIE_DOMAIN) {
      cookieOptions.domain = process.env.COOKIE_DOMAIN;
    }

    res.cookie('access_token', data.session.access_token, cookieOptions);
    res.cookie('refresh_token', data.session.refresh_token, {
      ...cookieOptions,
      maxAge: 604800000, // 7 days
    });

    console.log('✅ Cookies set successfully');

    // Return user data WITHOUT tokens
    res.json({
      user: data.user,
      session: { expires_at: data.session.expires_at }
    });
  } catch (error: any) {
    console.error('❌ Signin error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/auth/signup
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, fullName, invitation_token } = req.body;

    console.log('📝 Signup attempt:', email);
    if (invitation_token) {
      console.log('🎫 Signup with invitation token');
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    // IMPORTANT: This redirect URL MUST be added to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs
    // If not whitelisted, Supabase will ignore emailRedirectTo and use Site URL instead
    const redirectTo = `${frontendUrl}/auth?mode=login&message=email_confirmed`;
    
    console.log('📧 Signup - Email confirmation redirect URL:', redirectTo);
    console.log('📧 Signup - Make sure this URL is whitelisted in Supabase Dashboard → Auth → URL Configuration → Redirect URLs');
    
    // IMPORTANT: admin.createUser does NOT automatically send confirmation emails
    // even when email_confirm: false and SMTP is configured.
    // 
    // Solution: Use client-side signup (supabase.auth.signUp) which DOES send emails automatically.
    // We'll use the Supabase client with anon key (only for signup, not exposed to frontend)
    // to trigger the email sending, then manage the user via admin API if needed.
    
    // Get Supabase URL and anon key from environment (same as frontend uses)
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables (SUPABASE_URL or SUPABASE_ANON_KEY)');
    }
    
    // Create Supabase client with anon key (only used on backend for email sending)
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    
    // Use client-side signup which automatically sends confirmation email
    // This is the same method that was working before when using frontend
    console.log('📧 Using client-side signup to trigger automatic email sending...');
    
    const { data: signupData, error: signupError } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name: fullName,
        },
      },
    });

    if (signupError) {
      // If signup fails (e.g., user already exists), try to get the user
      if (signupError.message?.includes('already registered') || signupError.message?.includes('User already registered')) {
        // User already exists, get user info
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
        
        if (existingUser) {
          if (!existingUser.email_confirmed_at) {
            console.log('ℹ️ User exists but email not confirmed, resending confirmation email...');
            const { error: resendError } = await supabaseClient.auth.resend({
              type: 'signup',
              email: email,
              options: {
                emailRedirectTo: redirectTo,
              },
            });

            if (resendError) {
              console.error('❌ Error resending confirmation email:', resendError);
            } else {
              console.log('✅ Confirmation email resent to:', email);
            }

            return res.json({
              user: existingUser,
              message: 'User already exists. We resent the confirmation email. Please check your inbox.',
            });
          }

          console.log('ℹ️ User already exists and email is confirmed');
          return res.json({
            user: existingUser,
            message: 'User already exists. Please sign in.',
          });
        }
      }
      throw signupError;
    }

    if (!signupData.user) {
      throw new Error('Signup failed - no user data returned');
    }

    // Check if email was actually sent
    // Note: Supabase doesn't return explicit confirmation that email was sent,
    // but if signup succeeds and email confirmation is enabled, it should be sent
    const emailSent = signupData.user && !signupData.user.email_confirmed_at;
    
    console.log('✅ Signup successful');
    console.log('📧 User created:', signupData.user.email);
    console.log('📧 Email confirmation status:', signupData.user.email_confirmed_at ? 'Already confirmed' : 'Pending confirmation');
    
    if (emailSent) {
      console.log('📧 Confirmation email should be sent automatically by Supabase');
      console.log('💡 If email is not received, check:');
      console.log('   1. SMTP configuration in Supabase Dashboard → Settings → Auth → SMTP Settings');
      console.log('   2. "Confirm email" toggle in Dashboard → Authentication → Providers → Email (must be ENABLED)');
      console.log('   3. Redirect URL whitelisted in Dashboard → Auth → URL Configuration → Redirect URLs');
      console.log('   4. Check spam/junk folder');
      console.log('   5. Wait 1-5 minutes for email to arrive');
    } else {
      console.log('⚠️ Email may already be confirmed or email sending may be disabled');
    }
    
    // Store user data for response
    const data = { user: signupData.user };

    // Don't auto sign in - user needs to confirm email first
    // Role will be assigned after email confirmation via auto_assign_role_from_invitation function
    // The function is triggered by a database trigger when email_confirmed_at is set

    res.json({ 
      user: data.user,
      message: 'Please check your email to confirm your account before signing in.'
    });
  } catch (error: any) {
    console.error('❌ Signup error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/auth/confirm-email
 * 
 * Called after user confirms email - assigns role from invitation if applicable
 */
router.post('/confirm-email', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;

    if (!userEmail) {
      return res.status(400).json({ error: 'User email not found' });
    }

    console.log('📧 Processing email confirmation for:', userEmail);

    // Check if email is confirmed
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (userError || !user) {
      return res.status(400).json({ error: 'User not found' });
    }

    if (!user.email_confirmed_at) {
      return res.status(400).json({ error: 'Email not confirmed yet' });
    }

    // Now assign role from invitation (functions search by email)
    try {
      console.log('🔄 Auto-assigning role from invitation (email-based search)...');
      
      // First try super_admin_invitations function (searches by email)
      const { data: superAdminResult, error: superAdminError } = await supabaseAdmin
        .rpc('auto_assign_role_from_invitation', {
          p_user_id: userId,
          p_user_email: userEmail.toLowerCase(),
        });

      if (superAdminError) {
        console.error('❌ Error in auto_assign_role_from_invitation:', superAdminError);
      } else if (superAdminResult?.role_assigned) {
        console.log('✅ Super admin/clinic admin role assigned from invitation:', superAdminResult);
        return res.json({ 
          success: true, 
          role_assigned: true,
          role_type: superAdminResult.role_type,
          message: 'Role assigned successfully'
        });
      } else {
        // If no super admin invitation found, try clinic admin invitation (doctor role)
        console.log('ℹ️ No super admin invitation found, trying clinic admin invitation...');
        const { data: doctorResult, error: doctorError } = await supabaseAdmin
          .rpc('auto_assign_doctor_role_from_invitation', {
            p_user_id: userId,
            p_user_email: userEmail.toLowerCase(),
          });

        if (doctorError) {
          console.error('❌ Error in auto_assign_doctor_role_from_invitation:', doctorError);
        } else if (doctorResult?.role_assigned) {
          console.log('✅ Doctor role assigned from invitation:', doctorResult);
          return res.json({ 
            success: true, 
            role_assigned: true,
            role_type: 'doctor',
            message: 'Doctor role assigned successfully'
          });
        } else {
          console.log('⚠️ No pending invitation found for email:', userEmail);
          return res.json({ 
            success: true, 
            role_assigned: false,
            message: 'No pending invitation found - regular user signup'
          });
        }
      }
    } catch (invitationError: any) {
      console.error('❌ Error processing invitation:', invitationError);
      return res.status(500).json({ error: 'Failed to process invitation' });
    }
  } catch (error: any) {
    console.error('❌ Confirm email error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/auth/signout
 * 
 * Clears httpOnly cookies (frontend can't do this!)
 */
router.post('/signout', async (req, res) => {
  console.log('👋 Signout');
  
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  
  res.json({ success: true, message: 'Signed out successfully' });
});

/**
 * GET /api/auth/user
 * 
 * Returns current user (uses authenticate middleware)
 * Only returns safe user fields - no sensitive data
 */
router.get('/user', authenticate, async (req: AuthRequest, res) => {
  try {
    // Sanitize user object - only return safe fields
    const safeUser = {
      id: req.user.id,
      email: req.user.email,
      email_confirmed_at: req.user.email_confirmed_at,
      created_at: req.user.created_at,
      updated_at: req.user.updated_at,
      user_metadata: req.user.user_metadata,
      // Explicitly exclude sensitive fields:
      // - app_metadata (may contain sensitive data)
      // - raw_app_metadata
      // - raw_user_metadata
      // - aud (audience)
      // - role
      // - aal (authentication assurance level)
      // - amr (authentication methods)
      // - confirmation_sent_at
      // - recovery_sent_at
      // - email_change_sent_at
      // - new_email
      // - phone
      // - phone_confirmed_at
      // - phone_change
      // - phone_change_token
      // - email_change_token
      // - recovery_token
      // - confirmation_token
    };
    
    res.json({ user: safeUser });
  } catch (error: any) {
    console.error('❌ Get user error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/auth/session
 * 
 * Returns session tokens for frontend Supabase client
 * This allows the frontend Supabase client to have a session for RLS policies
 */
router.get('/session', authenticate, async (req: AuthRequest, res) => {
  try {
    const token = req.cookies.access_token;
    const refreshToken = req.cookies.refresh_token;

    if (!token) {
      return res.status(401).json({ error: 'No session token' });
    }

    // Get user to build session object
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Return session data for frontend Supabase client
    // This allows RLS policies to work
    res.json({
      access_token: token,
      refresh_token: refreshToken,
      expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      expires_in: 3600,
      token_type: 'bearer',
      user: user
    });
  } catch (error: any) {
    console.error('❌ Get session error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/auth/refresh
 * 
 * Refresh access token using refresh token from httpOnly cookie
 * This prevents the frontend from making direct Supabase calls
 */
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refresh_token;

    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token' });
    }

    // Refresh token via Supabase (on backend - credentials hidden)
    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      console.error('❌ Token refresh failed:', error?.message);
      // Clear invalid cookies
      res.clearCookie('access_token');
      res.clearCookie('refresh_token');
      return res.status(401).json({ error: 'Token refresh failed' });
    }

    // Update httpOnly cookies with new tokens (using same cookie options as signin)
    const cookieSecure = process.env.COOKIE_SECURE === 'true';
    const cookieOptions: any = {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: 'lax' as const,
      maxAge: 3600000, // 1 hour
    };

    if (process.env.COOKIE_DOMAIN) {
      cookieOptions.domain = process.env.COOKIE_DOMAIN;
    }

    res.cookie('access_token', data.session.access_token, cookieOptions);
    res.cookie('refresh_token', data.session.refresh_token, {
      ...cookieOptions,
      maxAge: 604800000, // 7 days
    });

    // Return session data for frontend Supabase client (for RLS)
    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      expires_in: data.session.expires_in,
      token_type: 'bearer',
      user: data.user
    });
  } catch (error: any) {
    console.error('❌ Refresh token error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/auth/resend-confirmation
 * 
 * Resends email confirmation for a user
 */
router.post('/resend-confirmation', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log('📧 Resending confirmation email to:', email);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const redirectTo = `${frontendUrl}/auth?mode=login&message=email_confirmed`;

    // Get Supabase URL and anon key from environment
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables (SUPABASE_URL or SUPABASE_ANON_KEY)');
    }

    // Create Supabase client with anon key
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if user exists
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.email_confirmed_at) {
      return res.status(400).json({ error: 'Email is already confirmed' });
    }

    // Resend confirmation email using client-side method
    const { error: resendError } = await supabaseClient.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (resendError) {
      console.error('❌ Error resending confirmation email:', resendError);
      throw resendError;
    }

    console.log('✅ Confirmation email resent successfully to:', email);

    res.json({
      success: true,
      message: 'Confirmation email has been sent. Please check your inbox.',
    });
  } catch (error: any) {
    console.error('❌ Resend confirmation error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/auth/reset-password
 * 
 * Sends password reset email to user
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log('🔐 Sending password reset email to:', email);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const redirectTo = `${frontendUrl}/auth?mode=login&message=password_reset`;

    // Get Supabase URL and anon key from environment
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables (SUPABASE_URL or SUPABASE_ANON_KEY)');
    }

    // Create Supabase client with anon key
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Always call resetPasswordForEmail - Supabase handles security (won't reveal if user exists)
    // This ensures emails are sent even if we can't verify the user exists via admin API
    console.log('📧 Calling Supabase resetPasswordForEmail...');
    const { data, error: resetError } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo,
    });

    if (resetError) {
      console.error('❌ Error sending password reset email:', resetError);
      throw resetError;
    }

    console.log('✅ Password reset email sent successfully to:', email);
    console.log('📧 Supabase response:', data);

    // Always return success message (for security - don't reveal if user exists)
    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent. Please check your email or spam folder.',
    });
  } catch (error: any) {
    console.error('❌ Reset password error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/auth/update-password
 *
 * Updates password using recovery tokens from the reset email.
 */
router.post('/update-password', async (req, res) => {
  try {
    const { accessToken, refreshToken, newPassword } = req.body;

    if (!accessToken || !refreshToken) {
      return res.status(400).json({ error: 'Reset tokens are required' });
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables (SUPABASE_URL or SUPABASE_ANON_KEY)');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Establish session using recovery tokens
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError || !sessionData?.session) {
      console.error('❌ Error setting session from recovery tokens:', sessionError);
      return res.status(400).json({ error: 'Invalid or expired reset tokens' });
    }

    // Update password for the user associated with the session
    const { error: updateError } = await supabaseClient.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      console.error('❌ Error updating password:', updateError);
      return res.status(400).json({ error: updateError.message || 'Failed to update password' });
    }

    // Set httpOnly cookies so the user is authenticated after reset
    const cookieSecure = process.env.COOKIE_SECURE === 'true';
    const cookieOptions: any = {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: 'lax' as const,
      maxAge: 3600000, // 1 hour
    };

    if (process.env.COOKIE_DOMAIN) {
      cookieOptions.domain = process.env.COOKIE_DOMAIN;
    }

    res.cookie('access_token', sessionData.session.access_token, cookieOptions);
    res.cookie('refresh_token', sessionData.session.refresh_token, {
      ...cookieOptions,
      maxAge: 604800000, // 7 days
    });

    res.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error: any) {
    console.error('❌ Update password error:', error);
    res.status(400).json({ error: error.message || 'Failed to update password' });
  }
});

/**
 * POST /api/auth/change-password
 * 
 * Changes password for authenticated user (requires current password)
 */
router.post('/change-password', authenticate, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const userId = req.user.id;
    const userEmail = req.user.email;

    if (!userEmail) {
      return res.status(400).json({ error: 'User email not found' });
    }

    console.log('🔐 Changing password for user:', userEmail);

    // First, verify the current password by attempting to sign in
    try {
      const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });

      if (signInError) {
        console.log('❌ Current password verification failed');
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
    } catch (verifyError: any) {
      console.error('❌ Error verifying current password:', verifyError);
      return res.status(400).json({ error: 'Failed to verify current password' });
    }

    // Update password using admin API
    const { data, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (updateError) {
      console.error('❌ Error updating password:', updateError);
      throw updateError;
    }

    console.log('✅ Password changed successfully for user:', userEmail);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error: any) {
    console.error('❌ Change password error:', error);
    res.status(400).json({ error: error.message || 'Failed to change password' });
  }
});

export default router;

