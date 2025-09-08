import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Header = () => {
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
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-base sm:text-lg font-normal hover:opacity-80 transition-opacity cursor-pointer"
            >
              <div className="w-6 h-6 sm:w-7 sm:h-7 bg-[#0C2243] rounded-md flex items-center justify-center">
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="#00FFA2" viewBox="0 0 24 24">
                  <circle cx="6" cy="6" r="3"/>
                  <circle cx="18" cy="8" r="2"/>
                  <circle cx="12" cy="16" r="2.5"/>
                  <circle cx="16" cy="18" r="1.5"/>
                  <line x1="9" y1="6" x2="15" y2="8" stroke="#00FFA2" strokeWidth="1.5"/>
                  <line x1="14" y1="14" x2="17" y2="17" stroke="#00FFA2" strokeWidth="1.5"/>
                </svg>
              </div>
              <span className="text-white">carelinx</span>
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
          {/* Back arrow for non-home pages */}
          {location.pathname !== '/' && (
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
          <div className="flex flex-col justify-center pt-2 pl-2">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-lg font-normal hover:opacity-80 transition-opacity cursor-pointer mb-2 self-start"
            >
              <div className="w-8 h-8 bg-[#0C2243] rounded-md flex items-center justify-center">
                <svg className="w-5 h-5" fill="#00FFA2" viewBox="0 0 24 24">
                  <circle cx="6" cy="6" r="3"/>
                  <circle cx="18" cy="8" r="2"/>
                  <circle cx="12" cy="16" r="2.5"/>
                  <circle cx="16" cy="18" r="1.5"/>
                  <line x1="9" y1="6" x2="15" y2="8" stroke="#00FFA2" strokeWidth="1.5"/>
                  <line x1="14" y1="14" x2="17" y2="17" stroke="#00FFA2" strokeWidth="1.5"/>
                </svg>
              </div>
              <span className="text-white">carelinx</span>
            </button>
            
            {/* Greeting Text */}
            {user && (
              <div className="text-left pl-2">
                <div className="text-sm text-white">Hi, {user.email?.split('@')[0]}</div>
                <div className="text-sm text-gray-300">Good morning</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
