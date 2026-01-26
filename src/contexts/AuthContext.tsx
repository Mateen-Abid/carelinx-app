import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { api } from '@/services/api';

export type UserRole = 'patient' | 'clinic_admin' | 'super_admin' | 'doctor';

interface AuthContextType {
  user: User | null;
  session: any;
  loading: boolean;
  userRole: UserRole | null;
  isSuperAdmin: boolean;
  isClinicAdmin: boolean;
  signUp: (email: string, password: string, fullName: string, invitationToken?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (fullName: string) => Promise<{ error: any }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  deleteAccount: () => Promise<{ error: any }>;
  resendConfirmation: (email: string) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  // Fetch user role from backend API (NO Supabase direct calls)
  const fetchUserRole = async (retryOnError = true): Promise<UserRole | null> => {
    try {
      console.log('📡 Fetching role from backend...');
      const { role } = await api.user.getUserRole();
      console.log('✅ Role from backend:', role);
      
      const mappedRole = (role === 'super_admin' || role === 'clinic_admin' || role === 'doctor') 
        ? role 
        : 'patient';
      
      setUserRole(mappedRole);
      localStorage.setItem('userRole', mappedRole);
      return mappedRole;
    } catch (error: any) {
      console.error('❌ Error fetching role:', error);
      
      // If it's a 401 (unauthorized), try refreshing token and retrying once
      if (retryOnError && error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        console.log('🔄 401 error - attempting token refresh and retry...');
        try {
          await api.auth.refreshToken();
          console.log('✅ Token refreshed, retrying role fetch...');
          return await fetchUserRole(false); // Retry once without infinite loop
        } catch (refreshError) {
          console.error('❌ Token refresh failed:', refreshError);
          // If refresh fails, preserve current role instead of defaulting to patient
          const currentRole = userRole || (localStorage.getItem('userRole') as UserRole | null);
          if (currentRole) {
            console.log('⚠️ Using preserved role:', currentRole);
            return currentRole;
          }
          return null; // Return null instead of 'patient' to indicate error
        }
      }
      
      // For other errors, preserve current role instead of defaulting to patient
      const currentRole = userRole || (localStorage.getItem('userRole') as UserRole | null);
      if (currentRole) {
        console.log('⚠️ Error fetching role, preserving current role:', currentRole);
        return currentRole;
      }
      
      // Only return null if we have no role at all
      console.warn('⚠️ No role available, returning null');
      return null;
    }
  };

  // Initialize auth state from backend
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check for email confirmation tokens FIRST - don't initialize auth if present
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const hashType = hashParams.get('type');
        const hashAccessToken = hashParams.get('access_token');
        const hashRefreshToken = hashParams.get('refresh_token');
        
        const isEmailConfirmation = (hashType === 'signup' || hashType === 'email') && hashAccessToken && hashRefreshToken;
        
        if (isEmailConfirmation) {
          console.log('🔄 AuthContext - Email confirmation tokens detected, skipping auth initialization');
          console.log('🔄 AuthContext - Redirecting to /auth');
          try {
            sessionStorage.setItem('email_just_confirmed', 'true');
            sessionStorage.setItem('email_confirmed_time', Date.now().toString());
          } catch (e) {
            console.warn('Failed to set email confirmation session flag:', e);
          }
          // Clear hash and redirect to auth page
          window.history.replaceState(null, '', '/auth?mode=login&message=email_confirmed');
          window.location.href = '/auth?mode=login&message=email_confirmed';
          setLoading(false);
          return; // Don't initialize auth
        }
        
        setLoading(true);
        console.log('🔄 Initializing auth from backend...');
        
        const { user: currentUser } = await api.auth.getCurrentUser();
        
        if (currentUser) {
          console.log('✅ User found:', currentUser.email);
          console.log('📧 User email_confirmed_at:', currentUser.email_confirmed_at);
          console.log('📧 Current pathname:', window.location.pathname);
          
          // CRITICAL: Check if user just confirmed their email and is on root page
          // This happens when Supabase processes hash tokens and auto-logs in, then redirects to /
          // We need to redirect BEFORE setting the user, otherwise Index page will render
          if (currentUser.email_confirmed_at && window.location.pathname === '/') {
            const confirmedTime = new Date(currentUser.email_confirmed_at).getTime();
            const now = Date.now();
            const timeSinceConfirmation = now - confirmedTime;
            
            console.log('📧 Time since email confirmation:', timeSinceConfirmation, 'ms');
            console.log('📧 Email confirmed at:', currentUser.email_confirmed_at);
            
            // Check role first - if user has no role or is still 'patient', redirect immediately
            // This catches users who just confirmed but haven't been assigned a role yet
            let shouldRedirect = false;
            
            try {
              const role = await fetchUserRole();
              console.log('📧 User role after confirmation:', role);
              
              // If user has no role or is 'patient', they likely just confirmed
              // Redirect them to email-confirmed page regardless of time
              if (!role || role === 'patient') {
                shouldRedirect = true;
                console.log('📧 User has no role or is patient - likely just confirmed, redirecting');
              }
            } catch (roleError) {
              console.error('Error fetching role:', roleError);
              // If we can't get role, assume they just confirmed and redirect
              shouldRedirect = true;
              console.log('📧 Error fetching role, assuming just confirmed, redirecting');
            }
            
            // Also always redirect if email was confirmed very recently (within 1 hour)
            // This catches the immediate confirmation case
            if (timeSinceConfirmation < 60 * 60 * 1000) {
              shouldRedirect = true;
              console.log('📧 Email confirmed within last hour, redirecting');
            }
            
            if (shouldRedirect) {
              console.log('🚨 AuthContext - User just confirmed email, redirecting to /auth');
              console.log('🚨 This prevents showing public pages after email confirmation');
              
              try {
                sessionStorage.setItem('email_just_confirmed', 'true');
                sessionStorage.setItem('email_confirmed_time', Date.now().toString());
              } catch (e) {
                console.warn('Failed to set email confirmation session flag:', e);
              }
              // Redirect immediately - don't set user state
              window.history.replaceState(null, '', '/auth?mode=login&message=email_confirmed');
              window.location.replace('/auth?mode=login&message=email_confirmed');
              setLoading(false);
              return; // CRITICAL: Don't set user, redirect instead
            }
          }
          
          setUser(currentUser);
          setSession({ user: currentUser });
          
          // NOTE: We do NOT sync session to Supabase client to avoid exposing API keys
          // All database operations go through the backend API which handles authentication
          // If RLS is needed for direct Supabase queries, use the backend API instead
          
          const role = await fetchUserRole();
          if (role) {
            console.log('✅ Auth initialized with role:', role);
          } else {
            console.warn('⚠️ Auth initialized but role fetch failed - using cached role if available');
            // Try to use cached role as fallback
            const cachedRole = localStorage.getItem('userRole') as UserRole | null;
            if (cachedRole) {
              setUserRole(cachedRole);
              console.log('✅ Using cached role:', cachedRole);
            }
          }
        } else {
          console.log('ℹ️ No active session');
        }
      } catch (error) {
        console.error('❌ Auth init error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Periodic token refresh through backend (prevents direct Supabase calls)
  useEffect(() => {
    if (!user) return;

    const refreshInterval = setInterval(async () => {
      try {
        // Refresh token through backend (no direct Supabase calls)
        // This keeps the httpOnly cookie refreshed
        await api.auth.refreshToken();
        console.log('✅ Token refreshed via backend');
        
        // CRITICAL: Refresh user role after token refresh to ensure it's still correct
        // This prevents role from being lost or defaulting to patient
        const refreshedRole = await fetchUserRole(false);
        if (refreshedRole) {
          console.log('✅ Role refreshed after token refresh:', refreshedRole);
        }
      } catch (error) {
        console.warn('⚠️ Token refresh failed:', error);
        // If token refresh fails, try to preserve current role
        const currentRole = userRole || (localStorage.getItem('userRole') as UserRole | null);
        if (currentRole) {
          console.log('⚠️ Preserving current role after refresh failure:', currentRole);
        }
      }
    }, 50 * 60 * 1000); // Refresh every 50 minutes (tokens expire after 1 hour)

    return () => clearInterval(refreshInterval);
  }, [user, userRole]);

  const signUp = async (email: string, password: string, fullName: string, invitationToken?: string) => {
    try {
      console.log('📡 Signing up via backend:', email);
      if (invitationToken) {
        console.log('🎫 Signup with invitation token');
      }
      
      const { user: newUser, message } = await api.auth.signUp(email, password, fullName, invitationToken);
      
      // Don't set user/session immediately - user needs to confirm email first
      if (message) {
        toast.info(message);
      } else {
        toast.success('Account created successfully! Please check your email to confirm your account.');
      }
      
      return { error: null };
    } catch (error: any) {
      console.error('❌ Sign up error:', error);
      toast.error(error.message || 'Failed to create account');
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('📡 Signing in via backend:', email);
      const { user: authenticatedUser } = await api.auth.signIn(email, password);
      
      setUser(authenticatedUser);
      setSession({ user: authenticatedUser });
      
      // Check if email is confirmed and assign role from invitation if applicable
      if (authenticatedUser?.email_confirmed_at) {
        console.log('✅ Email is confirmed, checking for pending invitation...');
        try {
          // Call backend to assign role from invitation
          await api.auth.confirmEmail();
          console.log('✅ Role assignment from invitation processed');
        } catch (roleError) {
          console.warn('⚠️ Role assignment error (may not have invitation):', roleError);
          // Continue anyway - user might not have an invitation
        }
      }
      
      await fetchUserRole();
      
      toast.success('Signed in successfully!');
      return { error: null };
    } catch (error: any) {
      console.error('❌ Sign in error:', error);
      toast.error(error.message || 'Failed to sign in');
      return { error };
    }
  };

  const signOut = async () => {
    try {
      console.log('📡 Signing out via backend...');
      await api.auth.signOut();
      
      setUser(null);
      setSession(null);
      setUserRole(null);
      localStorage.removeItem('userRole');
      
      toast.success('Signed out successfully');
    } catch (error: any) {
      console.error('❌ Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  const updateProfile = async (fullName: string) => {
    try {
      if (!user) {
        toast.error('You must be signed in to update your profile');
        return { error: new Error('Not authenticated') };
      }

      console.log('💾 Updating profile via backend...', { fullName });
      
      // Update profile via backend API
      const { profile } = await api.profiles.updateProfile({
        full_name: fullName.trim(),
      });

      console.log('✅ Profile updated successfully:', profile);

      // Update local user state if profile data is returned
      if (profile) {
        // Update user metadata if available
        setUser({
          ...user,
          user_metadata: {
            ...user.user_metadata,
            full_name: profile.full_name || fullName,
          },
        });
      }

      toast.success('Profile updated successfully');
      return { error: null };
    } catch (error: any) {
      console.error('❌ Update profile error:', error);
      toast.error(error.message || 'Failed to update profile');
      return { error };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      console.log('🔐 Changing password via backend...');
      const { message } = await api.auth.changePassword(currentPassword, newPassword);
      
      toast.success(message || 'Password changed successfully');
      return { error: null };
    } catch (error: any) {
      console.error('❌ Change password error:', error);
      toast.error(error.message || 'Failed to change password');
      return { error };
    }
  };

  const updatePassword = async (newPassword: string) => {
    toast.info('Password update will be implemented soon');
    return { error: null };
  };

  const deleteAccount = async () => {
    toast.info('Account deletion will be implemented soon');
    return { error: null };
  };

  const resendConfirmation = async (email: string) => {
    try {
      console.log('📧 Resending confirmation email to:', email);
      const { message } = await api.auth.resendConfirmation(email);
      
      toast.success(message || 'Confirmation email has been sent. Please check your inbox.');
      return { error: null };
    } catch (error: any) {
      console.error('❌ Resend confirmation error:', error);
      toast.error(error.message || 'Failed to resend confirmation email');
      return { error };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      console.log('🔐 Sending password reset email to:', email);
      const { message } = await api.auth.resetPassword(email);
      
      toast.success(message || 'If an account exists with this email, a password reset link has been sent.');
      return { error: null };
    } catch (error: any) {
      console.error('❌ Reset password error:', error);
      toast.error(error.message || 'Failed to send password reset email');
      return { error };
    }
  };

  const isSuperAdmin = userRole === 'super_admin';
  const isClinicAdmin = userRole === 'clinic_admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        userRole,
        isSuperAdmin,
        isClinicAdmin,
        signUp,
        signIn,
        signOut,
        updateProfile,
        changePassword,
        updatePassword,
        deleteAccount,
        resendConfirmation,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

