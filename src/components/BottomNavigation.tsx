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