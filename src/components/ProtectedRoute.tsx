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

  if (loading) {
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
    }
  }

  // If still no role, deny access (user needs to be assigned a role)
  if (!effectiveRole || !allowedRoles.includes(effectiveRole)) {
    console.log('🚫 Access denied. User role:', effectiveRole, 'Required roles:', allowedRoles);
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

