import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, AlertTriangle } from 'lucide-react';

interface CancelBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  appointmentDetails?: {
    clinic: string;
    specialty: string;
    doctorName: string;
    date: string;
    time: string;
  };
}

export const CancelBookingModal: React.FC<CancelBookingModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  appointmentDetails
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-xs w-full mx-auto bg-white rounded-2xl p-0 overflow-hidden [&>button]:hidden"
      >
        <div className="relative py-6 px-5 text-center">

          {/* ✅ Single Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>

          {/* ✅ Smaller Icon */}
          <div className="w-14 h-14 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-600" />
          </div>

          <DialogHeader className="text-center">
            <DialogTitle className="text-lg font-semibold text-gray-900 mb-1">
              Cancel Appointment?
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 mb-4">
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {appointmentDetails && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-left text-sm">
              <h4 className="font-medium text-gray-900 mb-2">Appointment Details:</h4>
              <p><strong>Service:</strong> {appointmentDetails.specialty}</p>
              <p><strong>Doctor:</strong> {appointmentDetails.doctorName}</p>
              <p><strong>Clinic:</strong> {appointmentDetails.clinic}</p>
              <p><strong>Date & Time:</strong> {appointmentDetails.date} at {appointmentDetails.time}</p>
            </div>
          )}

          <div className="space-y-2">
            <Button 
              className="w-full bg-red-600 hover:bg-red-700 text-white rounded-full py-2 text-sm font-medium"
              onClick={handleConfirm}
            >
              Yes, Cancel Appointment
            </Button>
            <Button 
              variant="outline" 
              className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 rounded-full py-2 text-sm font-medium"
              onClick={onClose}
            >
              Keep Appointment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
