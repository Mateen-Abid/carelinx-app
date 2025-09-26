import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';

interface HeaderProps {
  viewMode?: 'services' | 'clinics';
  onViewModeChange?: (mode: 'services' | 'clinics') => void;
}

const Header: React.FC<HeaderProps> = ({ viewMode, onViewModeChange }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  const handleClinicClick = () => {
    if (location.pathname === '/') {
      // If on home page, scroll to clinic section
      const clinicSection = document.getElementById('clinic-section');
      clinicSection?.scrollIntoView({ behavior: 'smooth' });
    } else {
      // If on other pages, navigate to home page
      navigate('/');
    }
  };

  return (
    <header className="bg-[#0C2243] w-full overflow-hidden">
      {/* Desktop Layout */}
      <div className="hidden sm:block">
        <div className="shadow-[0px_4px_40px_rgba(255,255,255,0.07)] flex min-h-[72px] w-full items-center text-white justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {/* Back button for clinics view on home page */}
            {location.pathname === '/' && viewMode === 'clinics' && onViewModeChange && (
              <button
                onClick={() => onViewModeChange('services')}
                className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-white/10 hover:bg-white/20 rounded-full transition-colors mr-3 mt-1"
                aria-label="Go back to services"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
            )}

            {/* Back button for clinic details page */}
            {location.pathname.startsWith('/clinic/') && (
              <button
                onClick={() => navigate('/')}
                className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-white/10 hover:bg-white/20 rounded-full transition-colors mr-3 mt-1"
                aria-label="Go back to home"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
            )}

            {/* Back button for service details page */}
            {location.pathname.startsWith('/service/') && (
              <button
                onClick={() => navigate(-1)}
                className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-white/10 hover:bg-white/20 rounded-full transition-colors mr-3 mt-1"
                aria-label="Go back to previous page"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
            )}
            
            <button 
              onClick={() => navigate('/')}
              className={`flex items-center gap-2 text-base sm:text-lg font-normal hover:opacity-80 transition-opacity cursor-pointer ${
                (location.pathname === '/' && viewMode === 'clinics') || 
                location.pathname.startsWith('/clinic/') || 
                location.pathname.startsWith('/service/') ? 'ml-0' : ''
              }`}
            >
              <div className="w-40 h-12 sm:w-48 sm:h-16 flex items-center justify-center">
                <svg width="100%" height="100%" viewBox="0 0 431 115" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="60.315" cy="95.1645" r="15.3474" transform="rotate(-15.4716 60.315 95.1645)" fill="#00FFA2"/>
                  <path d="M50.6471 14.1592C58.3393 6.33935 70.9144 6.23586 78.7343 13.9281C86.5542 21.6203 86.6577 34.1954 78.9655 42.0153C73.8288 47.2371 66.5154 49.0173 59.8942 47.3335C56.1372 46.378 51.854 46.6327 49.1354 49.3963C46.4169 52.16 46.2328 56.4468 47.25 60.1876C49.0426 66.7801 47.3831 74.1219 42.2464 79.3438C34.5542 87.1637 21.9791 87.2672 14.1592 79.575C6.33929 71.8828 6.23579 59.3077 13.928 51.4878C18.8792 46.4544 25.8529 44.6186 32.2797 46.0005C36.1682 46.8366 40.5399 46.5204 43.3292 43.6849C46.1184 40.8493 46.3626 36.473 45.4626 32.5987C43.9752 26.1956 45.696 19.1926 50.6471 14.1592Z" fill="#00FFA2"/>
                  <path d="M116.256 76.464C111.899 72.0493 109.72 66.746 109.72 60.554C109.72 54.362 111.899 49.0873 116.256 44.73C120.671 40.3727 125.974 38.194 132.166 38.194C136.237 38.194 139.992 39.226 143.432 41.29C146.872 43.2967 149.567 45.9913 151.516 49.374L140.68 55.652C139.419 51.8107 137.584 48.8293 135.176 46.708C132.768 44.5867 130.417 43.87 128.124 44.558C125.372 45.3607 123.509 47.912 122.534 52.212C121.387 57.2573 121.903 62.1307 124.082 66.832C126.891 72.7947 131.593 75.8907 138.186 76.12C142.945 76.292 148.391 74.8587 154.526 71.82C152.634 75.088 149.481 77.7827 145.066 79.904C140.709 81.968 136.409 83 132.166 83C125.974 83 120.671 80.8213 116.256 76.464ZM189.493 64.768V63.306C175.962 62.9047 169.197 65.1407 169.197 70.014C169.197 72.1927 170.888 73.7693 174.271 74.744C177.654 75.6613 181.036 75.2887 184.419 73.626C187.802 71.9633 189.493 69.0107 189.493 64.768ZM201.791 83C196.344 83 192.245 83 189.493 83V73.454C187.773 76.206 185.537 78.4993 182.785 80.334C180.033 82.1113 176.765 83 172.981 83C167.878 83 163.922 82.1113 161.113 80.334C158.304 78.4993 156.899 75.8047 156.899 72.25C156.899 70.4153 157.329 68.7527 158.189 67.262C159.049 65.714 160.138 64.4527 161.457 63.478C162.833 62.446 164.496 61.5573 166.445 60.812C168.452 60.0667 170.372 59.4933 172.207 59.092C174.099 58.6333 176.192 58.2893 178.485 58.06C180.778 57.7733 182.728 57.6013 184.333 57.544C185.938 57.4293 187.63 57.372 189.407 57.372C189.407 48.6573 186.139 44.3 179.603 44.3C178.8 44.3 178.026 44.4433 177.281 44.73C176.593 44.9593 175.991 45.246 175.475 45.59C175.016 45.8767 174.529 46.364 174.013 47.052C173.554 47.74 173.182 48.3133 172.895 48.772C172.608 49.2307 172.293 49.9187 171.949 50.836C171.605 51.7533 171.347 52.4413 171.175 52.9C171.06 53.3013 170.86 54.018 170.573 55.05C170.286 56.0247 170.114 56.6267 170.057 56.856C167.706 55.48 164.152 53.416 159.393 50.664C164.324 42.3507 171.06 38.194 179.603 38.194C186.655 38.194 192.073 40.2867 195.857 44.472C199.698 48.6573 201.619 54.3333 201.619 61.5C201.619 64.8253 201.648 68.7527 201.705 73.282C201.762 77.754 201.791 80.9933 201.791 83ZM207.814 38.194H220.112V47.74C221.717 44.7587 223.752 42.408 226.218 40.688C228.74 38.968 231.492 38.108 234.474 38.108C237.627 38.108 240.264 39.1113 242.386 41.118C244.564 43.0673 246.198 45.7907 247.288 49.288L236.28 55.566C236.05 52.0113 235.448 49.2593 234.474 47.31C233.499 45.3033 231.951 44.3 229.83 44.3C227.078 44.3 224.756 45.8767 222.864 49.03C221.029 52.1833 220.112 56.0247 220.112 60.554V83H207.814V38.194ZM261.959 57.544C266.259 57.544 269.757 57.286 272.451 56.77C275.203 56.1967 277.067 55.5087 278.041 54.706C279.016 53.9033 279.446 52.986 279.331 51.954C279.217 49.8327 277.955 47.912 275.547 46.192C273.197 44.4147 270.703 43.87 268.065 44.558C266.173 45.074 264.654 46.5647 263.507 49.03C262.418 51.4953 261.902 54.3333 261.959 57.544ZM256.197 76.464C251.84 72.0493 249.661 66.746 249.661 60.554C249.661 54.362 251.84 49.0873 256.197 44.73C260.612 40.3727 265.915 38.194 272.107 38.194C274.401 38.194 276.665 38.4807 278.901 39.054C281.137 39.6273 283.23 40.4873 285.179 41.634C287.129 42.7233 288.677 44.2427 289.823 46.192C291.027 48.1413 291.629 50.3487 291.629 52.814C291.629 54.3047 291.113 55.6807 290.081 56.942C289.107 58.2033 287.53 59.35 285.351 60.382C283.23 61.414 280.249 62.2167 276.407 62.79C272.566 63.3633 268.037 63.65 262.819 63.65C263.45 65.714 264.281 67.5773 265.313 69.24C266.403 70.8453 267.836 72.2787 269.613 73.54C271.448 74.744 273.512 75.5467 275.805 75.948C278.099 76.3493 280.851 76.2347 284.061 75.604C287.272 74.916 290.741 73.6547 294.467 71.82C292.575 75.088 289.451 77.7827 285.093 79.904C280.736 81.968 276.407 83 272.107 83C265.915 83 260.612 80.8213 256.197 76.464ZM310.859 83H298.561V22.8H310.859V83ZM318.739 32.604C317.535 31.4573 316.933 30.11 316.933 28.562C316.933 26.9567 317.535 25.6093 318.739 24.52C319.943 23.3733 321.376 22.8 323.039 22.8C324.759 22.8 326.221 23.3733 327.425 24.52C328.629 25.6093 329.231 26.9567 329.231 28.562C329.231 30.11 328.629 31.4573 327.425 32.604C326.221 33.6933 324.759 34.238 323.039 34.238C321.376 34.238 319.943 33.6933 318.739 32.604ZM316.933 38.194H329.231V83H316.933V38.194ZM335.305 38.194H347.603V47.912C349.209 44.9307 351.301 42.5513 353.881 40.774C356.519 38.9967 359.328 38.108 362.309 38.108C367.24 38.108 371.425 40.3153 374.865 44.73C378.363 49.0873 380.111 54.362 380.111 60.554V83H367.813V60.554C367.813 56.082 366.81 52.2693 364.803 49.116C362.854 45.9053 360.475 44.3 357.665 44.3C354.913 44.3 352.534 45.9053 350.527 49.116C348.578 52.2693 347.603 56.082 347.603 60.554V83H335.305V38.194ZM400.888 62.876L384.204 38.194H398.738L408.886 53.158L421.27 38.194H429.01L412.326 58.318L429.01 83H414.476L404.328 68.036L391.944 83H384.204L400.888 62.876Z" fill="white"/>
                </svg>
              </div>
            </button>
            <nav className="hidden md:flex items-center gap-4 lg:gap-6 text-sm font-medium ml-4 lg:ml-6">
              <div 
                onClick={() => navigate('/')}
                className="flex items-center gap-1 px-2.5 py-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                Home
              </div>
              {user && (
                <>
                  <div 
                    onClick={() => navigate('/my-bookings')}
                    className="flex items-center gap-1 px-2.5 py-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Booking
                  </div>
                  <div 
                    onClick={() => navigate('/profile')}
                    className="flex items-center gap-1 px-2.5 py-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Profile
                  </div>
                </>
              )}
            </nav>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 text-sm font-normal tracking-[-0.28px]">
            {user ? (
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="hidden sm:block">
                  <span className="hidden lg:block text-white truncate max-w-32">Welcome, {user.email}</span>
                </div>
                <button 
                  onClick={signOut}
                  className="hover:text-[rgba(0,255,162,1)] transition-colors px-2 sm:px-4 py-2 rounded-lg border border-white/20 hover:bg-white/10 text-xs sm:text-sm"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button 
                onClick={() => navigate('/auth?mode=login')}
                className="bg-[rgba(0,255,162,1)] text-[rgba(12,34,67,1)] px-2 sm:px-6 py-2 rounded-[40px] font-medium hover:bg-[rgba(0,255,162,0.9)] transition-colors text-xs sm:text-sm whitespace-nowrap"
              >
                Log in
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="block sm:hidden">
        <div className="shadow-[0px_4px_40px_rgba(255,255,255,0.07)] w-full text-white px-4 py-4">
          {/* Back arrow for non-home pages, excluding booking, profile, clinic, and service pages */}
          {location.pathname !== '/' && 
           location.pathname !== '/my-bookings' && 
           location.pathname !== '/profile' && 
           !location.pathname.startsWith('/clinic/') && 
           !location.pathname.startsWith('/service/') && (
            <div className="absolute left-4 top-4">
              <button 
                onClick={() => {
                  console.log('Back button clicked, current path:', location.pathname);
                  // Check if there's history to go back to
                  if (window.history.length > 1) {
                    navigate(-1);
                  } else {
                    // Fallback: navigate to home page
                    navigate('/');
                  }
                }}
                className="flex items-center justify-center w-8 h-8 hover:bg-white/10 rounded-md transition-colors"
                aria-label="Go back"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
          )}

          {/* Back button for clinics view on home page */}
          {location.pathname === '/' && viewMode === 'clinics' && onViewModeChange && (
            <div className="absolute left-4 top-5">
              <button
                onClick={() => onViewModeChange('services')}
                className="flex items-center justify-center w-8 h-8 hover:bg-white/10 rounded-md transition-colors"
                aria-label="Go back to services"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            </div>
          )}

          {/* Back button for clinic details page */}
          {location.pathname.startsWith('/clinic/') && (
            <div className="absolute left-4 top-5">
              <button
                onClick={() => navigate('/')}
                className="flex items-center justify-center w-8 h-8 hover:bg-white/10 rounded-md transition-colors"
                aria-label="Go back to home"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            </div>
          )}

          {/* Back button for service details page */}
          {location.pathname.startsWith('/service/') && (
            <div className="absolute left-4 top-5">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center justify-center w-8 h-8 hover:bg-white/10 rounded-md transition-colors"
                aria-label="Go back to previous page"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            </div>
          )}

          {/* Auth button for non-logged in users */}
          {!user && (
            <div className="absolute right-4 top-4">
              <button 
                onClick={() => navigate('/auth?mode=login')}
                className="bg-[rgba(0,255,162,1)] text-[rgba(12,34,67,1)] px-4 py-2 rounded-[40px] font-medium hover:bg-[rgba(0,255,162,0.9)] transition-colors text-xs whitespace-nowrap"
              >
                Log in
              </button>
            </div>
          )}

          {/* Sign out button for logged in users */}
          {user && (
            <div className="absolute right-4 top-4">
              <button 
                onClick={signOut}
                className="hover:text-[rgba(0,255,162,1)] transition-colors px-2 py-2 rounded-lg border border-white/20 hover:bg-white/10 text-xs"
              >
                Sign Out
              </button>
            </div>
          )}
          
          {/* Left-aligned Logo and Greeting */}
          <div className={`flex flex-col justify-start items-start pt-2 ${
            (location.pathname === '/' && viewMode === 'clinics') || 
            location.pathname.startsWith('/clinic/') || 
            location.pathname.startsWith('/service/') ? 'pl-12' : ''
          }`}>
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-lg font-normal hover:opacity-80 transition-opacity cursor-pointer mb-2"
            >
              <div className="w-36 h-10 flex items-center justify-center">
                <svg width="100%" height="100%" viewBox="0 0 431 115" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="60.315" cy="95.1645" r="15.3474" transform="rotate(-15.4716 60.315 95.1645)" fill="#00FFA2"/>
                  <path d="M50.6471 14.1592C58.3393 6.33935 70.9144 6.23586 78.7343 13.9281C86.5542 21.6203 86.6577 34.1954 78.9655 42.0153C73.8288 47.2371 66.5154 49.0173 59.8942 47.3335C56.1372 46.378 51.854 46.6327 49.1354 49.3963C46.4169 52.16 46.2328 56.4468 47.25 60.1876C49.0426 66.7801 47.3831 74.1219 42.2464 79.3438C34.5542 87.1637 21.9791 87.2672 14.1592 79.575C6.33929 71.8828 6.23579 59.3077 13.928 51.4878C18.8792 46.4544 25.8529 44.6186 32.2797 46.0005C36.1682 46.8366 40.5399 46.5204 43.3292 43.6849C46.1184 40.8493 46.3626 36.473 45.4626 32.5987C43.9752 26.1956 45.696 19.1926 50.6471 14.1592Z" fill="#00FFA2"/>
                  <path d="M116.256 76.464C111.899 72.0493 109.72 66.746 109.72 60.554C109.72 54.362 111.899 49.0873 116.256 44.73C120.671 40.3727 125.974 38.194 132.166 38.194C136.237 38.194 139.992 39.226 143.432 41.29C146.872 43.2967 149.567 45.9913 151.516 49.374L140.68 55.652C139.419 51.8107 137.584 48.8293 135.176 46.708C132.768 44.5867 130.417 43.87 128.124 44.558C125.372 45.3607 123.509 47.912 122.534 52.212C121.387 57.2573 121.903 62.1307 124.082 66.832C126.891 72.7947 131.593 75.8907 138.186 76.12C142.945 76.292 148.391 74.8587 154.526 71.82C152.634 75.088 149.481 77.7827 145.066 79.904C140.709 81.968 136.409 83 132.166 83C125.974 83 120.671 80.8213 116.256 76.464ZM189.493 64.768V63.306C175.962 62.9047 169.197 65.1407 169.197 70.014C169.197 72.1927 170.888 73.7693 174.271 74.744C177.654 75.6613 181.036 75.2887 184.419 73.626C187.802 71.9633 189.493 69.0107 189.493 64.768ZM201.791 83C196.344 83 192.245 83 189.493 83V73.454C187.773 76.206 185.537 78.4993 182.785 80.334C180.033 82.1113 176.765 83 172.981 83C167.878 83 163.922 82.1113 161.113 80.334C158.304 78.4993 156.899 75.8047 156.899 72.25C156.899 70.4153 157.329 68.7527 158.189 67.262C159.049 65.714 160.138 64.4527 161.457 63.478C162.833 62.446 164.496 61.5573 166.445 60.812C168.452 60.0667 170.372 59.4933 172.207 59.092C174.099 58.6333 176.192 58.2893 178.485 58.06C180.778 57.7733 182.728 57.6013 184.333 57.544C185.938 57.4293 187.63 57.372 189.407 57.372C189.407 48.6573 186.139 44.3 179.603 44.3C178.8 44.3 178.026 44.4433 177.281 44.73C176.593 44.9593 175.991 45.246 175.475 45.59C175.016 45.8767 174.529 46.364 174.013 47.052C173.554 47.74 173.182 48.3133 172.895 48.772C172.608 49.2307 172.293 49.9187 171.949 50.836C171.605 51.7533 171.347 52.4413 171.175 52.9C171.06 53.3013 170.86 54.018 170.573 55.05C170.286 56.0247 170.114 56.6267 170.057 56.856C167.706 55.48 164.152 53.416 159.393 50.664C164.324 42.3507 171.06 38.194 179.603 38.194C186.655 38.194 192.073 40.2867 195.857 44.472C199.698 48.6573 201.619 54.3333 201.619 61.5C201.619 64.8253 201.648 68.7527 201.705 73.282C201.762 77.754 201.791 80.9933 201.791 83ZM207.814 38.194H220.112V47.74C221.717 44.7587 223.752 42.408 226.218 40.688C228.74 38.968 231.492 38.108 234.474 38.108C237.627 38.108 240.264 39.1113 242.386 41.118C244.564 43.0673 246.198 45.7907 247.288 49.288L236.28 55.566C236.05 52.0113 235.448 49.2593 234.474 47.31C233.499 45.3033 231.951 44.3 229.83 44.3C227.078 44.3 224.756 45.8767 222.864 49.03C221.029 52.1833 220.112 56.0247 220.112 60.554V83H207.814V38.194ZM261.959 57.544C266.259 57.544 269.757 57.286 272.451 56.77C275.203 56.1967 277.067 55.5087 278.041 54.706C279.016 53.9033 279.446 52.986 279.331 51.954C279.217 49.8327 277.955 47.912 275.547 46.192C273.197 44.4147 270.703 43.87 268.065 44.558C266.173 45.074 264.654 46.5647 263.507 49.03C262.418 51.4953 261.902 54.3333 261.959 57.544ZM256.197 76.464C251.84 72.0493 249.661 66.746 249.661 60.554C249.661 54.362 251.84 49.0873 256.197 44.73C260.612 40.3727 265.915 38.194 272.107 38.194C274.401 38.194 276.665 38.4807 278.901 39.054C281.137 39.6273 283.23 40.4873 285.179 41.634C287.129 42.7233 288.677 44.2427 289.823 46.192C291.027 48.1413 291.629 50.3487 291.629 52.814C291.629 54.3047 291.113 55.6807 290.081 56.942C289.107 58.2033 287.53 59.35 285.351 60.382C283.23 61.414 280.249 62.2167 276.407 62.79C272.566 63.3633 268.037 63.65 262.819 63.65C263.45 65.714 264.281 67.5773 265.313 69.24C266.403 70.8453 267.836 72.2787 269.613 73.54C271.448 74.744 273.512 75.5467 275.805 75.948C278.099 76.3493 280.851 76.2347 284.061 75.604C287.272 74.916 290.741 73.6547 294.467 71.82C292.575 75.088 289.451 77.7827 285.093 79.904C280.736 81.968 276.407 83 272.107 83C265.915 83 260.612 80.8213 256.197 76.464ZM310.859 83H298.561V22.8H310.859V83ZM318.739 32.604C317.535 31.4573 316.933 30.11 316.933 28.562C316.933 26.9567 317.535 25.6093 318.739 24.52C319.943 23.3733 321.376 22.8 323.039 22.8C324.759 22.8 326.221 23.3733 327.425 24.52C328.629 25.6093 329.231 26.9567 329.231 28.562C329.231 30.11 328.629 31.4573 327.425 32.604C326.221 33.6933 324.759 34.238 323.039 34.238C321.376 34.238 319.943 33.6933 318.739 32.604ZM316.933 38.194H329.231V83H316.933V38.194ZM335.305 38.194H347.603V47.912C349.209 44.9307 351.301 42.5513 353.881 40.774C356.519 38.9967 359.328 38.108 362.309 38.108C367.24 38.108 371.425 40.3153 374.865 44.73C378.363 49.0873 380.111 54.362 380.111 60.554V83H367.813V60.554C367.813 56.082 366.81 52.2693 364.803 49.116C362.854 45.9053 360.475 44.3 357.665 44.3C354.913 44.3 352.534 45.9053 350.527 49.116C348.578 52.2693 347.603 56.082 347.603 60.554V83H335.305V38.194ZM400.888 62.876L384.204 38.194H398.738L408.886 53.158L421.27 38.194H429.01L412.326 58.318L429.01 83H414.476L404.328 68.036L391.944 83H384.204L400.888 62.876Z" fill="white"/>
                </svg>
              </div>
            </button>
            
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
