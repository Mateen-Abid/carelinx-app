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

  // Auto-close modal after 3 seconds (booking is processing on backend)
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      onConfirm();
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [isOpen, onConfirm, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md w-full mx-auto p-0 gap-0 bg-white rounded-2xl overflow-hidden">
        <div className="text-center p-8 pb-6">
          {/* Success Icon */}
          <div className="w-16 h-16 mx-auto mb-6 bg-gray-200 rounded-full flex items-center justify-center">
            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
              <Check className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Booking Request Sent
          </h2>

          {/* Description */}
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            Your appointment booking request has been submitted successfully. You will receive a confirmation shortly.
          </p>

          {/* Processing indicator */}
          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 text-center">
              Processing your booking request...
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div className="bg-[#0C2243] h-2 rounded-full animate-pulse"></div>
            </div>
          </div>

          {/* Booking Details */}
          <div className="text-left bg-gray-50 rounded-lg p-4 mb-6 text-sm">
            <p><strong>Date:</strong> {bookingDetails.date}</p>
            <p><strong>Time:</strong> {bookingDetails.time}</p>
            <p><strong>Service:</strong> {bookingDetails.service}</p>
            <p><strong>Clinic:</strong> {bookingDetails.clinic}</p>
          </div>

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