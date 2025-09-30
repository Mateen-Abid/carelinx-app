import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { BookingProvider } from "./contexts/BookingContext";
import { AuthProvider } from "./contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ClinicDetails from "./pages/ClinicDetails";
import ServiceDetails from "./pages/ServiceDetails";
import MyBookings from "./pages/MyBookings";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

// Immediate check for password reset parameters on page load
const checkForPasswordResetImmediate = () => {
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
checkForPasswordResetImmediate();

// Component to handle password reset redirects
const PasswordResetHandler = () => {
  const location = useLocation();
  
  // Debug logging
  console.log('PasswordResetHandler - Current location:', location);
  console.log('PasswordResetHandler - Hash:', location.hash);
  console.log('PasswordResetHandler - Search:', location.search);
  console.log('PasswordResetHandler - Full URL:', window.location.href);
  
  // Check if we have password reset parameters in the URL hash
  const hashParams = new URLSearchParams(location.hash.substring(1));
  const hashType = hashParams.get('type');
  const hashAccessToken = hashParams.get('access_token');
  const hashRefreshToken = hashParams.get('refresh_token');
  
  // Check if we have password reset parameters in the URL search params
  const searchParams = new URLSearchParams(location.search);
  const searchType = searchParams.get('type');
  const searchAccessToken = searchParams.get('access_token');
  const searchRefreshToken = searchParams.get('refresh_token');
  
  console.log('PasswordResetHandler - Hash params:', {
    type: hashType,
    accessToken: hashAccessToken ? 'present' : 'missing',
    refreshToken: hashRefreshToken ? 'present' : 'missing'
  });
  
  console.log('PasswordResetHandler - Search params:', {
    type: searchType,
    accessToken: searchAccessToken ? 'present' : 'missing',
    refreshToken: searchRefreshToken ? 'present' : 'missing'
  });
  
  // Check for password reset in both hash and search params
  const isPasswordReset = (hashType === 'recovery' && hashAccessToken && hashRefreshToken) || 
                         (searchType === 'recovery' && searchAccessToken && searchRefreshToken);
  
  if (isPasswordReset) {
    console.log('PasswordResetHandler - Password reset detected, redirecting to reset password page');
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
    console.log('PasswordResetHandler redirecting to:', resetUrl);
    return <Navigate to={resetUrl} replace />;
  }
  
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BookingProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <PasswordResetHandler />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/clinic/:clinicId" element={<ClinicDetails />} />
              <Route path="/service/:serviceId" element={<ServiceDetails />} />
              <Route path="/my-bookings" element={<MyBookings />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </BookingProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
