import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { updatePathname } from "./contexts/DarkModeContext";
import { BookingProvider } from "./contexts/BookingContext";
import { AuthProvider } from "./contexts/AuthContext";
import { DarkModeProvider } from "./contexts/DarkModeContext";
import { SidebarProvider } from "./contexts/SidebarContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ClinicDetails from "./pages/ClinicDetails";
import ServiceDetails from "./pages/ServiceDetails";
import MyBookings from "./pages/MyBookings";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import ResetPassword from "./pages/ResetPassword";
import InviteAcceptance from "./pages/InviteAcceptance";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminClinics from "./pages/admin/Clinics";
import AdminAppointments from "./pages/admin/Appointments";
import AdminDoctors from "./pages/admin/Doctors";
import AdminServices from "./pages/admin/Services";
import AdminPatients from "./pages/admin/Patients";
import AdminSettings from "./pages/admin/Settings";
import ClinicAdminDashboard from "./pages/clinic-admin/Dashboard";
import ClinicAdminAppointments from "./pages/clinic-admin/Appointments";
import ClinicAdminServices from "./pages/clinic-admin/Services";
import ClinicAdminDoctors from "./pages/clinic-admin/Doctors";
import ClinicAdminPatients from "./pages/clinic-admin/Patients";
import ClinicAdminClinicProfile from "./pages/clinic-admin/ClinicProfile";
import ClinicAdminSettings from "./pages/clinic-admin/Settings";
import ClinicAdminInsights from "./pages/clinic-admin/Insights";
import ClinicOnboarding from "./pages/clinic-admin/ClinicOnboarding";
import DoctorAppointments from "./pages/doctor/Appointments";
import DoctorPatients from "./pages/doctor/Patients";

const queryClient = new QueryClient();

// Immediate check for password reset and email confirmation parameters on page load
const checkForAuthRedirectsImmediate = () => {
  console.log('Immediate check - Current URL:', window.location.href);
  console.log('Immediate check - Hash:', window.location.hash);
  console.log('Immediate check - Search:', window.location.search);
  
  // Check hash parameters
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const hashType = hashParams.get('type');
  const hashAccessToken = hashParams.get('access_token');
  const hashRefreshToken = hashParams.get('refresh_token');
  
  // Check search parameters
  const searchParams = new URLSearchParams(window.location.search);
  const searchType = searchParams.get('type');
  const searchAccessToken = searchParams.get('access_token');
  const searchRefreshToken = searchParams.get('refresh_token');
  
  console.log('Immediate check - Hash params:', {
    type: hashType,
    accessToken: hashAccessToken ? 'present' : 'missing',
    refreshToken: hashRefreshToken ? 'present' : 'missing'
  });
  
  console.log('Immediate check - Search params:', {
    type: searchType,
    accessToken: searchAccessToken ? 'present' : 'missing',
    refreshToken: searchRefreshToken ? 'present' : 'missing'
  });
  
  // Check for email confirmation errors (expired/invalid link)
  const hashError = hashParams.get('error');
  const hashErrorCode = hashParams.get('error_code');
  
  if (hashError === 'access_denied' && (hashErrorCode === 'otp_expired' || hashErrorCode === 'email_not_confirmed')) {
    console.log('Immediate check - Email confirmation link expired/invalid, redirecting to auth page');
    // Redirect to auth page with error message
    window.location.href = '/auth?mode=login&error=email_link_expired&message=The+email+confirmation+link+has+expired.+Please+request+a+new+confirmation+email.';
    return true;
  }
  
  // Check for email confirmation (signup or email type)
  // Also check if we're on root path with hash (Supabase might redirect to /#)
  const isEmailConfirmation = (hashType === 'signup' || hashType === 'email') && hashAccessToken && hashRefreshToken;
  const isOnRootWithHash = window.location.pathname === '/' && window.location.hash && (hashType === 'signup' || hashType === 'email');
  
  if (isEmailConfirmation || isOnRootWithHash) {
    console.log('Immediate check - Email confirmation detected, clearing hash and redirecting to auth');
    console.log('Immediate check - Hash type:', hashType, 'Has tokens:', !!hashAccessToken);
    try {
      sessionStorage.setItem('email_just_confirmed', 'true');
      sessionStorage.setItem('email_confirmed_time', Date.now().toString());
    } catch (e) {
      console.warn('Failed to set email confirmation session flag:', e);
    }
    // Clear hash and redirect to auth page
    window.history.replaceState(null, '', '/auth?mode=login&message=email_confirmed');
    window.location.href = '/auth?mode=login&message=email_confirmed';
    return true;
  }
  
  // Check for password reset in both hash and search params
  const isPasswordReset = (hashType === 'recovery' && hashAccessToken && hashRefreshToken) || 
                         (searchType === 'recovery' && searchAccessToken && searchRefreshToken);
  
  if (isPasswordReset) {
    console.log('Immediate check - Password reset detected, redirecting to reset password page');
    // Preserve the tokens in the URL when redirecting
    const tokens = hashAccessToken ? {
      access_token: hashAccessToken,
      refresh_token: hashRefreshToken,
      type: hashType
    } : {
      access_token: searchAccessToken,
      refresh_token: searchRefreshToken,
      type: searchType
    };
    
    // Build URL with tokens as hash parameters
    const resetUrl = `/reset-password#access_token=${tokens.access_token}&refresh_token=${tokens.refresh_token}&type=${tokens.type}`;
    console.log('Redirecting to:', resetUrl);
    window.location.href = resetUrl;
    return true;
  }
  
  return false;
};

// Run immediate check
checkForAuthRedirectsImmediate();

// Component to handle password reset and email confirmation redirects and route tracking
const AuthRedirectHandler = () => {
  const location = useLocation();
  
  // Update pathname for dark mode context
  useEffect(() => {
    updatePathname(location.pathname);
  }, [location.pathname]);
  
  // Debug logging
  console.log('AuthRedirectHandler - Current location:', location);
  console.log('AuthRedirectHandler - Hash:', location.hash);
  console.log('AuthRedirectHandler - Search:', location.search);
  console.log('AuthRedirectHandler - Full URL:', window.location.href);
  
  // Check if we have auth parameters in the URL hash
  const hashParams = new URLSearchParams(location.hash.substring(1));
  const hashType = hashParams.get('type');
  const hashAccessToken = hashParams.get('access_token');
  const hashRefreshToken = hashParams.get('refresh_token');
  
  // Check if we have auth parameters in the URL search params
  const searchParams = new URLSearchParams(location.search);
  const searchType = searchParams.get('type');
  const searchAccessToken = searchParams.get('access_token');
  const searchRefreshToken = searchParams.get('refresh_token');
  
  console.log('AuthRedirectHandler - Hash params:', {
    type: hashType,
    accessToken: hashAccessToken ? 'present' : 'missing',
    refreshToken: hashRefreshToken ? 'present' : 'missing'
  });
  
  console.log('AuthRedirectHandler - Search params:', {
    type: searchType,
    accessToken: searchAccessToken ? 'present' : 'missing',
    refreshToken: searchRefreshToken ? 'present' : 'missing'
  });
  
  // Check for email confirmation (signup or email type)
  const isEmailConfirmation = (hashType === 'signup' || hashType === 'email') && hashAccessToken && hashRefreshToken;
  
  if (isEmailConfirmation && location.pathname !== '/auth') {
    console.log('AuthRedirectHandler - Email confirmation detected, redirecting to auth page');
    return <Navigate to="/auth?mode=login&message=email_confirmed" replace />;
  }
  
  // Check for password reset in both hash and search params
  const isPasswordReset = (hashType === 'recovery' && hashAccessToken && hashRefreshToken) || 
                         (searchType === 'recovery' && searchAccessToken && searchRefreshToken);
  
  if (isPasswordReset && location.pathname !== '/reset-password') {
    console.log('AuthRedirectHandler - Password reset detected, redirecting to reset password page');
    // Preserve the tokens in the URL when redirecting
    const tokens = hashAccessToken ? {
      access_token: hashAccessToken,
      refresh_token: hashRefreshToken,
      type: hashType
    } : {
      access_token: searchAccessToken,
      refresh_token: searchRefreshToken,
      type: searchType
    };
    
    // Build URL with tokens as hash parameters
    const resetUrl = `/reset-password#access_token=${tokens.access_token}&refresh_token=${tokens.refresh_token}&type=${tokens.type}`;
    console.log('AuthRedirectHandler redirecting to:', resetUrl);
    return <Navigate to={resetUrl} replace />;
  }
  
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <DarkModeProvider>
        <SidebarProvider>
          <BookingProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AuthRedirectHandler />
                <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/invite/:token" element={<InviteAcceptance />} />
              <Route path="/clinic/:clinicId" element={<ClinicDetails />} />
              <Route path="/service/:serviceId" element={<ServiceDetails />} />
              <Route path="/my-bookings" element={<MyBookings />} />
              
              {/* Super Admin Routes */}
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/clinics" element={<AdminClinics />} />
              <Route path="/admin/appointments" element={<AdminAppointments />} />
              <Route path="/admin/doctors" element={<AdminDoctors />} />
              <Route path="/admin/services" element={<AdminServices />} />
              <Route path="/admin/patients" element={<AdminPatients />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              
              {/* Clinic Admin Routes */}
              <Route path="/clinic-admin/onboarding" element={<ClinicOnboarding />} />
              <Route path="/clinic-admin/dashboard" element={<ClinicAdminDashboard />} />
              <Route path="/clinic-admin/appointments" element={<ClinicAdminAppointments />} />
              <Route path="/clinic-admin/services" element={<ClinicAdminServices />} />
              <Route path="/clinic-admin/doctors" element={<ClinicAdminDoctors />} />
              <Route path="/clinic-admin/patients" element={<ClinicAdminPatients />} />
              <Route path="/clinic-admin/clinic-profile" element={<ClinicAdminClinicProfile />} />
              <Route path="/clinic-admin/insights" element={<ClinicAdminInsights />} />
              <Route path="/clinic-admin/settings" element={<ClinicAdminSettings />} />
              
              {/* Doctor Routes */}
              <Route path="/doctor/appointments" element={<DoctorAppointments />} />
              <Route path="/doctor/patients" element={<DoctorPatients />} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </BookingProvider>
      </SidebarProvider>
      </DarkModeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
