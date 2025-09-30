import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Check, X, ArrowLeft } from 'lucide-react';

const ResetPassword = () => {
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  const { user, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const checkAuthAndHandleReset = async () => {
      try {
        console.log('Checking authentication for password reset...');
        console.log('Current URL:', window.location.href);
        console.log('Hash:', window.location.hash);
        console.log('Search params:', window.location.search);
        
        // Check if we have URL fragments (access_token, refresh_token, etc.)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        console.log('Hash params:', {
          accessToken: accessToken ? 'present' : 'missing',
          refreshToken: refreshToken ? 'present' : 'missing',
          type
        });

        // If we have tokens from password reset email, set the session
        if (accessToken && refreshToken && type === 'recovery') {
          console.log('Password reset tokens found, setting session...');
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            console.error('Error setting session:', error);
            setError('Invalid or expired reset link. Please request a new password reset.');
            setIsCheckingAuth(false);
            return;
          }

          console.log('Session set successfully');
          setIsAuthenticated(true);
          setIsCheckingAuth(false);
          return;
        }

        // If user is already authenticated, allow password reset
        if (user) {
          console.log('User already authenticated');
          setIsAuthenticated(true);
          setIsCheckingAuth(false);
          return;
        }

        // If no tokens and no user, redirect to login
        console.log('No valid session or reset tokens found');
        navigate('/auth?mode=login&message=Please use the password reset link from your email');
        setIsCheckingAuth(false);
      } catch (err) {
        console.error('Error checking authentication:', err);
        setError('An error occurred. Please try again.');
        setIsCheckingAuth(false);
      }
    };

    checkAuthAndHandleReset();
  }, [user, navigate]);

  const validatePassword = (password: string) => {
    return {
      hasMinLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
  };

  const passwordValidation = validatePassword(formData.password);
  const isPasswordValid = Object.values(passwordValidation).every(Boolean);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isPasswordValid) {
      setError('Please ensure your password meets all requirements');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const { error } = await updatePassword(formData.password);
      
      if (error) {
        setError(error.message || 'Failed to update password');
      } else {
        setSuccess(true);
        // Redirect to home page after 2 seconds
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    }
    
    setLoading(false);
  };

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#1A202C] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="w-full max-w-md relative z-10">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-8 bg-[#00FFA2] rounded-full flex items-center justify-center animate-spin">
              <div className="w-8 h-8 border-4 border-[#1A202C] border-t-transparent rounded-full"></div>
            </div>
            <h1 className="text-white text-xl font-bold mb-4">
              Verifying Reset Link...
            </h1>
            <p className="text-gray-300">
              Please wait while we verify your password reset link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show error if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#1A202C] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="w-full max-w-md relative z-10">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-8 bg-red-500 rounded-full flex items-center justify-center">
              <X className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-white text-xl font-bold mb-4">
              Invalid Reset Link
            </h1>
            <p className="text-gray-300 mb-8">
              {error || 'This password reset link is invalid or has expired. Please request a new one.'}
            </p>
            <Button
              onClick={() => navigate('/auth?mode=login')}
              className="w-full h-12 bg-[#00FFC2] hover:bg-[#00FFC2]/90 text-[#1A202C] font-bold text-base rounded-full"
            >
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#1A202C] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Logo Graphics */}
        <div className="fixed -top-24 -right-64 w-[400px] h-[400px] opacity-20 z-0">
          <svg width="400" height="400" viewBox="0 0 431 115" className="w-full h-full">
            <circle cx="60.315" cy="95.1645" r="15.3474" transform="rotate(-15.4716 60.315 95.1645)" fill="#00FFA2" opacity="0.3"/>
            <path d="M50.6471 14.1592C58.3393 6.33935 70.9144 6.23586 78.7343 13.9281C86.5542 21.6203 86.6577 34.1954 78.9655 42.0153C73.8288 47.2371 66.5154 49.0173 59.8942 47.3335C56.1372 46.378 51.854 46.6327 49.1354 49.3963C46.4169 52.16 46.2328 56.4468 47.25 60.1876C49.0426 66.7801 47.3831 74.1219 42.2464 79.3438C34.5542 87.1637 21.9791 87.2672 14.1592 79.575C6.33929 71.8828 6.23579 59.3077 13.928 51.4878C18.8792 46.4544 25.8529 44.6186 32.2797 46.0005C36.1682 46.8366 40.5399 46.5204 43.3292 43.6849C46.1184 40.8493 46.3626 36.473 45.4626 32.5987C43.9752 26.1956 45.696 19.1926 50.6471 14.1592Z" fill="#00FFA2" opacity="0.3"/>
          </svg>
        </div>

        <div className="w-full max-w-md relative z-10">
          <div className="text-center">
            {/* Success Icon */}
            <div className="w-24 h-24 mx-auto mb-8 bg-[#00FFA2] rounded-full flex items-center justify-center">
              <Check className="w-12 h-12 text-[#1A202C]" />
            </div>
            
            <h1 className="text-white text-2xl font-bold mb-4">
              Password Updated Successfully!
            </h1>
            
            <p className="text-gray-300 mb-8">
              Your password has been changed successfully. You will be redirected to the home page shortly.
            </p>
            
            <Button
              onClick={() => navigate('/')}
              className="w-full h-12 bg-[#00FFC2] hover:bg-[#00FFC2]/90 text-[#1A202C] font-bold text-base rounded-full"
            >
              Go to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A202C] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Logo Graphics */}
      <div className="fixed -top-24 -right-64 w-[400px] h-[400px] opacity-20 z-0">
        <svg width="400" height="400" viewBox="0 0 431 115" className="w-full h-full">
          <circle cx="60.315" cy="95.1645" r="15.3474" transform="rotate(-15.4716 60.315 95.1645)" fill="#00FFA2" opacity="0.3"/>
          <path d="M50.6471 14.1592C58.3393 6.33935 70.9144 6.23586 78.7343 13.9281C86.5542 21.6203 86.6577 34.1954 78.9655 42.0153C73.8288 47.2371 66.5154 49.0173 59.8942 47.3335C56.1372 46.378 51.854 46.6327 49.1354 49.3963C46.4169 52.16 46.2328 56.4468 47.25 60.1876C49.0426 66.7801 47.3831 74.1219 42.2464 79.3438C34.5542 87.1637 21.9791 87.2672 14.1592 79.575C6.33929 71.8828 6.23579 59.3077 13.928 51.4878C18.8792 46.4544 25.8529 44.6186 32.2797 46.0005C36.1682 46.8366 40.5399 46.5204 43.3292 43.6849C46.1184 40.8493 46.3626 36.473 45.4626 32.5987C43.9752 26.1956 45.696 19.1926 50.6471 14.1592Z" fill="#00FFA2" opacity="0.3"/>
        </svg>
      </div>

      {/* Back Button */}
      <button
        onClick={() => navigate('/')}
        className="fixed top-4 left-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        aria-label="Go back to home"
      >
        <ArrowLeft className="w-6 h-6 text-white" />
      </button>

      {/* Main Content Container */}
      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex items-center mb-8 mt-8">
          <svg width="431" height="115" viewBox="0 0 431 115" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-12 w-auto">
            <circle cx="60.315" cy="95.1645" r="15.3474" transform="rotate(-15.4716 60.315 95.1645)" fill="#00FFA2"/>
            <path d="M50.6471 14.1592C58.3393 6.33935 70.9144 6.23586 78.7343 13.9281C86.5542 21.6203 86.6577 34.1954 78.9655 42.0153C73.8288 47.2371 66.5154 49.0173 59.8942 47.3335C56.1372 46.378 51.854 46.6327 49.1354 49.3963C46.4169 52.16 46.2328 56.4468 47.25 60.1876C49.0426 66.7801 47.3831 74.1219 42.2464 79.3438C34.5542 87.1637 21.9791 87.2672 14.1592 79.575C6.33929 71.8828 6.23579 59.3077 13.928 51.4878C18.8792 46.4544 25.8529 44.6186 32.2797 46.0005C36.1682 46.8366 40.5399 46.5204 43.3292 43.6849C46.1184 40.8493 46.3626 36.473 45.4626 32.5987C43.9752 26.1956 45.696 19.1926 50.6471 14.1592Z" fill="#00FFA2"/>
            <path d="M116.256 76.464C111.899 72.0493 109.72 66.746 109.72 60.554C109.72 54.362 111.899 49.0873 116.256 44.73C120.671 40.3727 125.974 38.194 132.166 38.194C136.237 38.194 139.992 39.226 143.432 41.29C146.872 43.2967 149.567 45.9913 151.516 49.374L140.68 55.652C139.419 51.8107 137.584 48.8293 135.176 46.708C132.768 44.5867 130.417 43.87 128.124 44.558C125.372 45.3607 123.509 47.912 122.534 52.212C121.387 57.2573 121.903 62.1307 124.082 66.832C126.891 72.7947 131.593 75.8907 138.186 76.12C142.945 76.292 148.391 74.8587 154.526 71.82C152.634 75.088 149.481 77.7827 145.066 79.904C140.709 81.968 136.409 83 132.166 83C125.974 83 120.671 80.8213 116.256 76.464ZM189.493 64.768V63.306C175.962 62.9047 169.197 65.1407 169.197 70.014C169.197 72.1927 170.888 73.7693 174.271 74.744C177.654 75.6613 181.036 75.2887 184.419 73.626C187.802 71.9633 189.493 69.0107 189.493 64.768ZM201.791 83C196.344 83 192.245 83 189.493 83V73.454C187.773 76.206 185.537 78.4993 182.785 80.334C180.033 82.1113 176.765 83 172.981 83C167.878 83 163.922 82.1113 161.113 80.334C158.304 78.4993 156.899 75.8047 156.899 72.25C156.899 70.4153 157.329 68.7527 158.189 67.262C159.049 65.714 160.138 64.4527 161.457 63.478C162.833 62.446 164.496 61.5573 166.445 60.812C168.452 60.0667 170.372 59.4933 172.207 59.092C174.099 58.6333 176.192 58.2893 178.485 58.06C180.778 57.7733 182.728 57.6013 184.333 57.544C185.938 57.4293 187.63 57.372 189.407 57.372C189.407 48.6573 186.139 44.3 179.603 44.3C178.8 44.3 178.026 44.4433 177.281 44.73C176.593 44.9593 175.991 45.246 175.475 45.59C175.016 45.8767 174.529 46.364 174.013 47.052C173.554 47.74 173.182 48.3133 172.895 48.772C172.608 49.2307 172.293 49.9187 171.949 50.836C171.605 51.7533 171.347 52.4413 171.175 52.9C171.06 53.3013 170.86 54.018 170.573 55.05C170.286 56.0247 170.114 56.6267 170.057 56.856C167.706 55.48 164.152 53.416 159.393 50.664C164.324 42.3507 171.06 38.194 179.603 38.194C186.655 38.194 192.073 40.2867 195.857 44.472C199.698 48.6573 201.619 54.3333 201.619 61.5C201.619 64.8253 201.648 68.7527 201.705 73.282C201.762 77.754 201.791 80.9933 201.791 83ZM207.814 38.194H220.112V47.74C221.717 44.7587 223.752 42.408 226.218 40.688C228.74 38.968 231.492 38.108 234.474 38.108C237.627 38.108 240.264 39.1113 242.386 41.118C244.564 43.0673 246.198 45.7907 247.288 49.288L236.28 55.566C236.05 52.0113 235.448 49.2593 234.474 47.31C233.499 45.3033 231.951 44.3 229.83 44.3C227.078 44.3 224.756 45.8767 222.864 49.03C221.029 52.1833 220.112 56.0247 220.112 60.554V83H207.814V38.194ZM261.959 57.544C266.259 57.544 269.757 57.286 272.451 56.77C275.203 56.1967 277.067 55.5087 278.041 54.706C279.016 53.9033 279.446 52.986 279.331 51.954C279.217 49.8327 277.955 47.912 275.547 46.192C273.197 44.4147 270.703 43.87 268.065 44.558C266.173 45.074 264.654 46.5647 263.507 49.03C262.418 51.4953 261.902 54.3333 261.959 57.544ZM256.197 76.464C251.84 72.0493 249.661 66.746 249.661 60.554C249.661 54.362 251.84 49.0873 256.197 44.73C260.612 40.3727 265.915 38.194 272.107 38.194C274.401 38.194 276.665 38.4807 278.901 39.054C281.137 39.6273 283.23 40.4873 285.179 41.634C287.129 42.7233 288.677 44.2427 289.823 46.192C291.027 48.1413 291.629 50.3487 291.629 52.814C291.629 54.3047 291.113 55.6807 290.081 56.942C289.107 58.2033 287.53 59.35 285.351 60.382C283.23 61.414 280.249 62.2167 276.407 62.79C272.566 63.3633 268.037 63.65 262.819 63.65C263.45 65.714 264.281 67.5773 265.313 69.24C266.403 70.8453 267.836 72.2787 269.613 73.54C271.448 74.744 273.512 75.5467 275.805 75.948C278.099 76.3493 280.851 76.2347 284.061 75.604C287.272 74.916 290.741 73.6547 294.467 71.82C292.575 75.088 289.451 77.7827 285.093 79.904C280.736 81.968 276.407 83 272.107 83C265.915 83 260.612 80.8213 256.197 76.464ZM310.859 83H298.561V22.8H310.859V83ZM318.739 32.604C317.535 31.4573 316.933 30.11 316.933 28.562C316.933 26.9567 317.535 25.6093 318.739 24.52C319.943 23.3733 321.376 22.8 323.039 22.8C324.759 22.8 326.221 23.3733 327.425 24.52C328.629 25.6093 329.231 26.9567 329.231 28.562C329.231 30.11 328.629 31.4573 327.425 32.604C326.221 33.6933 324.759 34.238 323.039 34.238C321.376 34.238 319.943 33.6933 318.739 32.604ZM316.933 38.194H329.231V83H316.933V38.194ZM335.305 38.194H347.603V47.912C349.209 44.9307 351.301 42.5513 353.881 40.774C356.519 38.9967 359.328 38.108 362.309 38.108C367.24 38.108 371.425 40.3153 374.865 44.73C378.363 49.0873 380.111 54.362 380.111 60.554V83H367.813V60.554C367.813 56.082 366.81 52.2693 364.803 49.116C362.854 45.9053 360.475 44.3 357.665 44.3C354.913 44.3 352.534 45.8767 350.527 49.116C348.578 52.2693 347.603 56.082 347.603 60.554V83H335.305V38.194ZM400.888 62.876L384.204 38.194H398.738L408.886 53.158L421.27 38.194H429.01L412.326 58.318L429.01 83H414.476L404.328 68.036L391.944 83H384.204L400.888 62.876Z" fill="white"/>
          </svg>
        </div>

        {/* Welcome Message */}
        <div className="text-left mb-8">
          <h1 className="text-white text-2xl font-bold">
            Reset Your Password
          </h1>
          <p className="text-gray-300 text-sm mt-2">
            Enter your new password below
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-6">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="password" className="text-white text-sm font-medium block mb-2">
              New Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your new password"
                className="w-full h-12 bg-[#F0F0F0] border-0 rounded-full px-4 text-[#6B7280] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#00FFC2] pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#6B7280] hover:text-[#00FFC2]"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="text-white text-sm font-medium block mb-2">
              Confirm New Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your new password"
                className="w-full h-12 bg-[#F0F0F0] border-0 rounded-full px-4 text-[#6B7280] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#00FFC2] pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#6B7280] hover:text-[#00FFC2]"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Password Requirements */}
          <div className="text-xs grid grid-cols-2 gap-x-4 gap-y-1">
            <div className={`flex items-center gap-1 ${passwordValidation.hasMinLength ? 'text-[#00FFC2]' : 'text-[#6B7280]'}`}>
              {passwordValidation.hasMinLength ? <Check size={12} /> : <X size={12} />}
              <span>8+ characters</span>
            </div>
            <div className={`flex items-center gap-1 ${passwordValidation.hasNumber ? 'text-[#00FFC2]' : 'text-[#6B7280]'}`}>
              {passwordValidation.hasNumber ? <Check size={12} /> : <X size={12} />}
              <span>Number</span>
            </div>
            <div className={`flex items-center gap-1 ${passwordValidation.hasUpperCase && passwordValidation.hasLowerCase ? 'text-[#00FFC2]' : 'text-[#6B7280]'}`}>
              {passwordValidation.hasUpperCase && passwordValidation.hasLowerCase ? <Check size={12} /> : <X size={12} />}
              <span>Uppercase and lowercase letters</span>
            </div>
            <div className={`flex items-center gap-1 ${passwordValidation.hasSpecialChar ? 'text-[#00FFC2]' : 'text-[#6B7280]'}`}>
              {passwordValidation.hasSpecialChar ? <Check size={12} /> : <X size={12} />}
              <span>Special character</span>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading || !isPasswordValid || formData.password !== formData.confirmPassword}
            className="w-full h-12 bg-[#00FFC2] hover:bg-[#00FFC2]/90 text-[#1A202C] font-bold text-base rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-[#00FFC2] focus:ring-offset-2 focus:ring-offset-[#1A202C]"
          >
            {loading ? 'Updating Password...' : 'Update Password'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
