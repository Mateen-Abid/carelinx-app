import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  redirectTo = '/'
}) => {
  const { user, userRole, loading } = useAuth();
  const [isChecking, setIsChecking] = React.useState(true);

  // Wait a bit for role to load if user exists
  React.useEffect(() => {
    if (user && !userRole && !loading) {
      // Give it more time to fetch role from DB
      const timer = setTimeout(() => {
        setIsChecking(false);
      }, 1000); // Wait 1 second for role to load
      return () => clearTimeout(timer);
    } else {
      setIsChecking(false);
    }
  }, [user, userRole, loading]);

  if (loading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-[#0C2243] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth?mode=login" replace />;
  }

  // Determine effective role: use userRole from context, or check localStorage as fallback
  let effectiveRole = userRole;
  if (!effectiveRole) {
    // Check localStorage as fallback (in case role is still loading)
    const storedRole = localStorage.getItem('userRole') as UserRole | null;
    if (storedRole) {
      effectiveRole = storedRole;
      console.log('📋 Using cached role from localStorage:', storedRole);
    }
  }

  // If still no role after waiting, deny access
  if (!effectiveRole || !allowedRoles.includes(effectiveRole)) {
    console.log('🚫 Access denied. User role:', effectiveRole, 'Required roles:', allowedRoles);
    console.log('🚫 User:', user?.email, 'UserRole from context:', userRole, 'Cached role:', localStorage.getItem('userRole'));
    return <Navigate to={redirectTo} replace />;
  }

  console.log('✅ Access granted. User role:', effectiveRole, 'Required roles:', allowedRoles);
  return <>{children}</>;
};

