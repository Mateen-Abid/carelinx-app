import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/services/api';
import { toast } from 'sonner';

export type UserRole = 'patient' | 'clinic_admin' | 'super_admin' | 'doctor';

interface User {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
  };
}

interface Session {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: User;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: UserRole | null;
  isSuperAdmin: boolean;
  isClinicAdmin: boolean;
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
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  const isSuperAdmin = userRole === 'super_admin';
  const isClinicAdmin = userRole === 'clinic_admin';

  // Fetch user role from backend
  const fetchUserRole = async (): Promise<UserRole> => {
    try {
      const { role } = await api.user.getUserRole();
      console.log('✅ Role fetched from backend:', role);
      setUserRole(role as UserRole);
      localStorage.setItem('userRole', role);
      return role as UserRole;
    } catch (error: any) {
      console.error('❌ Error fetching user role:', error);
      // Try cached role
      const cachedRole = localStorage.getItem('userRole');
      if (cachedRole) {
        console.log('✅ Using cached role after error:', cachedRole);
        setUserRole(cachedRole as UserRole);
        return cachedRole as UserRole;
      }
      return 'patient';
    }
  };

  // Initialize session from localStorage
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const storedSession = localStorage.getItem('session');
        const storedUser = localStorage.getItem('user');
        
        if (storedSession && storedUser) {
          const sessionData = JSON.parse(storedSession);
          const userData = JSON.parse(storedUser);
          
          console.log('✅ Restored session from localStorage');
          setSession(sessionData);
          setUser(userData);
          
          // Fetch role from backend
          await fetchUserRole();
        } else {
          console.log('ℹ️ No stored session found');
        }
      } catch (error) {
        console.error('❌ Error initializing session:', error);
        localStorage.removeItem('session');
        localStorage.removeItem('user');
        localStorage.removeItem('userRole');
      } finally {
        setLoading(false);
      }
    };

    initializeSession();
  }, []);

  // Sign up
  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const response = await api.auth.signUp(email, password, fullName);
      
      if (response.session) {
        const sessionData = response.session;
        const userData = sessionData.user;
        
        setSession(sessionData);
        setUser(userData);
        localStorage.setItem('session', JSON.stringify(sessionData));
        localStorage.setItem('user', JSON.stringify(userData));
        
        await fetchUserRole();
      }
      
      return { error: null };
    } catch (error: any) {
      console.error('Sign up error:', error);
      return { error };
    }
  };

  // Sign in
  const signIn = async (email: string, password: string) => {
    try {
      const response = await api.auth.signIn(email, password);
      
      if (response.session) {
        const sessionData = response.session;
        const userData = sessionData.user;
        
        setSession(sessionData);
        setUser(userData);
        localStorage.setItem('session', JSON.stringify(sessionData));
        localStorage.setItem('user', JSON.stringify(userData));
        
        await fetchUserRole();
      }
      
      return { error: null };
    } catch (error: any) {
      console.error('Sign in error:', error);
      return { error };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await api.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setSession(null);
      setUser(null);
      setUserRole(null);
      localStorage.removeItem('session');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
    }
  };

  // Update profile
  const updateProfile = async (fullName: string) => {
    try {
      // Implementation needed in backend
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  // Change password
  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      await api.auth.updatePassword(newPassword);
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  // Update password (without current password)
  const updatePassword = async (newPassword: string) => {
    try {
      await api.auth.updatePassword(newPassword);
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  // Delete account
  const deleteAccount = async () => {
    try {
      // Implementation needed in backend
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  // Resend confirmation
  const resendConfirmation = async (email: string) => {
    try {
      // Implementation needed in backend
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      await api.auth.resetPasswordRequest(email);
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

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

