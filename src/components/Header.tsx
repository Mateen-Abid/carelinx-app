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
    <header className="bg-[rgba(12,34,67,1)] w-full overflow-hidden">
      <div className="shadow-[0px_4px_40px_rgba(255,255,255,0.07)] flex min-h-[72px] w-full items-center text-white justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <div className="flex items-center gap-2 sm:gap-4 text-lg sm:text-xl lg:text-[26px] font-semibold text-center uppercase tracking-[-1.04px]">
            <img
              src="/lovable-uploads/98d21f35-691f-49cf-874c-d5b499678040.png"
              className="aspect-[1] object-contain w-8 sm:w-10 shrink-0"
              alt="Carelinx Logo"
            />
            <div className="hidden sm:block">
              Carelinx
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium tracking-[-0.28px] ml-4 lg:ml-8">
            <div 
              onClick={() => navigate('/')}
              className="flex items-center gap-1 px-2.5 py-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              Home
            </div>
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
          </nav>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4 text-sm font-normal tracking-[-0.28px]">
          {user ? (
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="hidden lg:block text-white truncate max-w-32">Welcome, {user.email}</span>
              <button 
                onClick={signOut}
                className="hover:text-[rgba(0,255,162,1)] transition-colors px-2 sm:px-4 py-2 rounded-lg border border-white/20 hover:bg-white/10 text-xs sm:text-sm"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button 
              onClick={() => navigate('/auth')}
              className="hidden sm:block hover:text-[rgba(0,255,162,1)] transition-colors px-2 sm:px-4 py-2"
            >
              Log in
            </button>
          )}
          <button 
            onClick={() => navigate('/auth')}
            className="bg-[rgba(0,255,162,1)] text-[rgba(12,34,67,1)] px-3 sm:px-6 py-2 rounded-[40px] font-medium hover:bg-[rgba(0,255,162,0.9)] transition-colors text-xs sm:text-sm whitespace-nowrap"
          >
            Sign Up
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
