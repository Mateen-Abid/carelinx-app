import React from 'react';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BookingConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  bookingDetails: {
    date: string;
    time: string;
    service: string;
    clinic: string;
  };
}

const BookingConfirmationModal: React.FC<BookingConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  bookingDetails
}) => {
  const navigate = useNavigate();

  const handleViewBooking = () => {
    navigate('/my-bookings');
    onClose();
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="max-w-xs w-full mx-4 bg-white rounded-2xl shadow-xl border-0 p-0 overflow-hidden">
            <div className="text-center py-6 px-5">
          {/* Success Icon - Concentric circles with shield */}
          <div className="w-14 h-14 mx-auto mb-6 relative">
            {/* Outer light gray circle */}
            <div className="absolute inset-0 bg-gray-200 rounded-full"></div>
            {/* Middle gray circle */}
            <div className="absolute inset-2 bg-gray-300 rounded-full"></div>
            {/* Inner dark circle with shield */}
            <div className="absolute inset-4 bg-black rounded-full flex items-center justify-center">
              <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
                <Check className="w-3 h-3 text-black" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Booking Request Sent
          </h2>

          {/* Description */}
          <p className="text-gray-600 text-sm mb-8 leading-relaxed max-w-xs mx-auto">
            Your appointment booking request has been sent. We'll get back to you shortly.
          </p>

          {/* View Booking Button */}
          <Button
            onClick={handleViewBooking}
            className="w-full bg-[#0C2243] hover:bg-[#0C2243]/90 text-white font-medium py-3 rounded-xl transition-colors"
          >
            View Booking
          </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BookingConfirmationModal;