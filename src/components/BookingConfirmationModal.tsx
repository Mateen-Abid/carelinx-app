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
  const [timeLeft, setTimeLeft] = useState(20);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(20);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onConfirm();
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onConfirm, onClose]);

  const handleViewBooking = () => {
    navigate('/my-bookings');
    onClose();
  };

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
            Your appointment booking request has been sent. We'll get back to you shortly.
          </p>

          {/* Timer */}
          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Confirming booking in <span className="font-semibold text-gray-900">{timeLeft}s</span>
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-[#0C2243] h-2 rounded-full transition-all duration-1000" 
                style={{ width: `${((20 - timeLeft) / 20) * 100}%` }}
              ></div>
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