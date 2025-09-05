import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Calendar, User } from 'lucide-react';

interface BottomNavigationProps {
  viewMode: 'services' | 'clinics';
  onViewModeChange: (mode: 'services' | 'clinics') => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ viewMode, onViewModeChange }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 sm:hidden z-50">
      {/* Services/Clinics Toggle - Only show on home page */}
      {location.pathname === '/' && (
        <div className="flex justify-center mb-3">
          <div className="flex bg-gray-100 rounded-full p-1 w-full max-w-sm">
            <button
              onClick={() => onViewModeChange('services')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                viewMode === 'services'
                  ? 'bg-[#0C2243] text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              </svg>
              Services
            </button>
            <button
              onClick={() => onViewModeChange('clinics')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                viewMode === 'clinics'
                  ? 'bg-[#00FFA2] text-[#0C2243]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
              </svg>
              Clinics
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation Icons */}
      <div className="flex justify-around items-center">
        <button
          onClick={() => navigate('/')}
          className={`flex flex-col items-center gap-1 p-2 ${
            isActive('/') 
              ? 'text-[#0C2243]' 
              : 'text-gray-500'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-xs">Home</span>
        </button>

        <button
          onClick={() => navigate('/my-bookings')}
          className={`flex flex-col items-center gap-1 p-2 ${
            isActive('/my-bookings') 
              ? 'text-[#0C2243]' 
              : 'text-gray-500'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-xs">Booking</span>
        </button>

        <button
          onClick={() => navigate('/profile')}
          className={`flex flex-col items-center gap-1 p-2 ${
            isActive('/profile') 
              ? 'text-[#0C2243]' 
              : 'text-gray-500'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-xs">Profile</span>
        </button>
      </div>
    </div>
  );
};

export default BottomNavigation;