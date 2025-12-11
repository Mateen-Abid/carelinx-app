import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

interface DarkModeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

// Global pathname tracker for route changes
let currentPathname = typeof window !== 'undefined' ? window.location.pathname : '';
const pathnameListeners = new Set<() => void>();

// Function to update pathname and notify listeners
export const updatePathname = (newPathname: string) => {
  if (currentPathname !== newPathname) {
    currentPathname = newPathname;
    pathnameListeners.forEach(listener => listener());
  }
};

export const useDarkMode = () => {
  const context = useContext(DarkModeContext);
  if (context === undefined) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  return context;
};

export const DarkModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuth();
  const userRole = auth?.userRole || null;
  const pathnameRef = useRef(typeof window !== 'undefined' ? window.location.pathname : '');

  // Get role-specific dark mode preference
  const getDarkModePreference = (role: 'super_admin' | 'clinic_admin' | null): boolean => {
    if (!role) return false;
    try {
      const saved = localStorage.getItem(`darkMode_${role}`);
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  };

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return getDarkModePreference(userRole === 'super_admin' || userRole === 'clinic_admin' ? userRole : null);
  });

  // Update dark mode state when role changes
  useEffect(() => {
    if (userRole === 'super_admin' || userRole === 'clinic_admin') {
      const preference = getDarkModePreference(userRole);
      setIsDarkMode(preference);
    } else {
      setIsDarkMode(false);
    }
  }, [userRole]);

  // Apply or remove dark mode class based on current pathname
  useEffect(() => {
    const updateDarkMode = () => {
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
      pathnameRef.current = pathname;
      const isAdminPage = pathname.startsWith('/admin/');
      const isClinicAdminPage = pathname.startsWith('/clinic-admin/');
      
      if (userRole === 'super_admin' && isAdminPage) {
        if (isDarkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } else if (userRole === 'clinic_admin' && isClinicAdminPage) {
        if (isDarkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    // Initial update
    updateDarkMode();
    
    // Listen for route changes via custom event
    const handlePathnameChange = () => {
      updateDarkMode();
    };
    
    pathnameListeners.add(handlePathnameChange);
    
    // Also listen for browser navigation
    window.addEventListener('popstate', updateDarkMode);

    return () => {
      pathnameListeners.delete(handlePathnameChange);
      window.removeEventListener('popstate', updateDarkMode);
    };
  }, [isDarkMode, userRole]);

  // Save to localStorage when dark mode changes
  useEffect(() => {
    if (userRole === 'super_admin' || userRole === 'clinic_admin') {
      localStorage.setItem(`darkMode_${userRole}`, JSON.stringify(isDarkMode));
    }
  }, [isDarkMode, userRole]);

  const toggleDarkMode = () => {
    if (userRole === 'super_admin' || userRole === 'clinic_admin') {
      setIsDarkMode((prev) => !prev);
    }
  };

  return (
    <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
};

