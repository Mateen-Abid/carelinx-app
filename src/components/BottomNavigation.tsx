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
          <Home className={`w-5 h-5 ${isActive('/') ? 'stroke-2' : 'stroke-1'}`} />
          <div className="relative">
            <span className={`text-xs ${isActive('/') ? 'font-semibold' : 'font-normal'}`}>Home</span>
            {isActive('/') && (
              <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#0C2243] rounded-full"></div>
            )}
          </div>
        </button>

        <button
          onClick={() => navigate('/my-bookings')}
          className={`flex flex-col items-center gap-1 p-2 ${
            isActive('/my-bookings') 
              ? 'text-[#0C2243]' 
              : 'text-gray-500'
          }`}
        >
          <Calendar className={`w-5 h-5 ${isActive('/my-bookings') ? 'stroke-2' : 'stroke-1'}`} />
          <div className="relative">
            <span className={`text-xs ${isActive('/my-bookings') ? 'font-semibold' : 'font-normal'}`}>Booking</span>
            {isActive('/my-bookings') && (
              <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#0C2243] rounded-full"></div>
            )}
          </div>
        </button>

        <button
          onClick={() => navigate('/profile')}
          className={`flex flex-col items-center gap-1 p-2 ${
            isActive('/profile') 
              ? 'text-[#0C2243]' 
              : 'text-gray-500'
          }`}
        >
          <User className={`w-5 h-5 ${isActive('/profile') ? 'stroke-2' : 'stroke-1'}`} />
          <div className="relative">
            <span className={`text-xs ${isActive('/profile') ? 'font-semibold' : 'font-normal'}`}>Profile</span>
            {isActive('/profile') && (
              <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#0C2243] rounded-full"></div>
            )}
          </div>
        </button>
      </div>
    </div>
  );
};

export default BottomNavigation;