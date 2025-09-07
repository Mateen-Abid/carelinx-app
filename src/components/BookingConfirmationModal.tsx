import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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

  // Removed auto-close functionality as requested

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md w-full mx-auto p-0 gap-0 bg-white rounded-2xl overflow-hidden">
        <div className="text-center p-8 pb-6">
          {/* Success Icon - Concentric circles with shield */}
          <div className="w-20 h-20 mx-auto mb-6 relative">
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
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
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
      </DialogContent>
    </Dialog>
  );
};

export default BookingConfirmationModal;