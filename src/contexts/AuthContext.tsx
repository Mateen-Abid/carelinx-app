import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
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
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          }
        }
      });
      
      console.log('SignUp response:', { data, error }); // Debug logging
      
      if (error) {
        console.log('SignUp error:', error.message); // Debug logging
        
        // Check for specific error types
        if (error.message.includes('already registered') || 
            error.message.includes('already been registered') ||
            error.message.includes('User already registered') ||
            error.message.includes('already exists') ||
            error.message.includes('duplicate') ||
            error.message.includes('already in use')) {
          return { 
            error: { 
              message: 'An account with this email already exists. Please try signing in instead.',
              type: 'duplicate_email'
            } 
          };
        }
        
        toast.error(error.message);
        return { error };
      }
      
      // Check if user was actually created (Supabase returns success but no user for existing emails)
      if (!data.user) {
        console.log('No user created - likely duplicate email'); // Debug logging
        return { 
          error: { 
            message: 'An account with this email already exists. Please try signing in instead.',
            type: 'duplicate_email'
          } 
        };
      }
      
      // Additional check: if user exists but email is not confirmed, it might be a duplicate
      if (data.user && !data.user.email_confirmed_at) {
        console.log('User created but email not confirmed - checking if this is a duplicate'); // Debug logging
        
        // Try to sign in to see if the account actually exists
        try {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          
          if (!signInError) {
            // If sign in works, the account already exists
            console.log('Account already exists - sign in successful'); // Debug logging
            return { 
              error: { 
                message: 'An account with this email already exists. Please try signing in instead.',
                type: 'duplicate_email'
              } 
            };
          }
        } catch (signInTestError) {
          // If sign in fails, it's a new account
          console.log('Sign in test failed - this is a new account'); // Debug logging
        }
      }
      
      toast.success('Account created successfully! Please check your email to confirm your account.');
      return { error: null };
    } catch (error: any) {
      console.log('SignUp catch error:', error); // Debug logging
      toast.error(error.message);
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        toast.error(error.message);
        return { error };
      }
      
      if (data.user) {
        toast.success('Welcome back!');
        
        // Check for pending booking and redirect accordingly
        const pendingBooking = sessionStorage.getItem('pendingBooking');
        if (pendingBooking) {
          const bookingData = JSON.parse(pendingBooking);
          sessionStorage.removeItem('pendingBooking');
          window.location.href = bookingData.returnTo || '/';
        } else {
          window.location.href = '/';
        }
      }
      
      return { error: null };
    } catch (error: any) {
      toast.error(error.message);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Signed out successfully');
        window.location.href = '/';
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const updateProfile = async (fullName: string) => {
    try {
      if (!user) throw new Error('No user logged in');

      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('user_id', user.id);

      if (error) {
        toast.error(error.message);
        return { error };
      }

      toast.success('Profile updated successfully');
      return { error: null };
    } catch (error: any) {
      toast.error(error.message);
      return { error };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      if (!user?.email) throw new Error('No user email found');

      // First verify current password
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (verifyError) {
        toast.error('Current password is incorrect');
        return { error: verifyError };
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        toast.error(error.message);
        return { error };
      }

      toast.success('Password updated successfully');
      return { error: null };
    } catch (error: any) {
      toast.error(error.message);
      return { error };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      if (!user) throw new Error('No user logged in');

      // Update password (for password reset scenarios)
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        toast.error(error.message);
        return { error };
      }

      toast.success('Password updated successfully');
      return { error: null };
    } catch (error: any) {
      toast.error(error.message);
      return { error };
    }
  };

  const deleteAccount = async () => {
    try {
      if (!user) throw new Error('No user logged in');

      // Delete profile first
      await supabase
        .from('profiles')
        .delete()
        .eq('user_id', user.id);

      // Note: Deleting the auth user is typically done via admin API
      // For now, we'll just sign out and show a message
      await signOut();
      toast.success('Account deletion initiated. Please contact support to complete the process.');
      
      return { error: null };
    } catch (error: any) {
      toast.error(error.message);
      return { error };
    }
  };

  const resendConfirmation = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) {
        toast.error(error.message);
        return { error };
      }
      
      toast.success('Confirmation email resent! Please check your inbox.');
      return { error: null };
    } catch (error: any) {
      toast.error(error.message);
      return { error };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        toast.error(error.message);
        return { error };
      }
      
      toast.success('Password reset email sent! Please check your inbox.');
      return { error: null };
    } catch (error: any) {
      toast.error(error.message);
      return { error };
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    changePassword,
    updatePassword,
    deleteAccount,
    resendConfirmation,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

