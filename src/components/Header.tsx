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
      <div className="shadow-[0px_4px_40px_rgba(255,255,255,0.07)] flex min-h-[72px] w-full items-center text-white justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Back arrow - only on mobile and not on home page */}
          {location.pathname !== '/' && (
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
              className="sm:hidden flex items-center justify-center w-8 h-8 mr-2 hover:bg-white/10 rounded-md transition-colors"
              aria-label="Go back"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-base sm:text-lg font-normal hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="w-6 h-6 sm:w-7 sm:h-7 bg-[#00FFA2] rounded-md flex items-center justify-center">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-[#0C2243]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
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
              <div className="block sm:hidden text-white">
                <div className="text-xs">Hi, {user.email?.split('@')[0]}</div>
                <div className="text-xs text-gray-300">Good morning</div>
              </div>
              <button 
                onClick={signOut}
                className="hover:text-[rgba(0,255,162,1)] transition-colors px-2 sm:px-4 py-2 rounded-lg border border-white/20 hover:bg-white/10 text-xs sm:text-sm"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2">
              <button 
                onClick={() => navigate('/auth')}
                className="hover:text-[rgba(0,255,162,1)] transition-colors px-2 sm:px-4 py-2 text-xs sm:text-sm"
              >
                Log in
              </button>
              <button 
                onClick={() => navigate('/auth')}
                className="bg-[rgba(0,255,162,1)] text-[rgba(12,34,67,1)] px-2 sm:px-6 py-2 rounded-[40px] font-medium hover:bg-[rgba(0,255,162,0.9)] transition-colors text-xs sm:text-sm whitespace-nowrap"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
