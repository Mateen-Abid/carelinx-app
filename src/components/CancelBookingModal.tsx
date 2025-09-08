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
      <DialogContent className="max-w-md mx-auto bg-white rounded-2xl p-0 overflow-hidden">
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 z-10"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          
          <div className="text-center py-8 px-6">
            <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            
            <DialogHeader className="text-center">
              <DialogTitle className="text-xl font-bold text-gray-900 mb-2">
                Cancel Appointment?
              </DialogTitle>
              <DialogDescription className="text-gray-600 mb-6">
                Are you sure you want to cancel this appointment? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            {appointmentDetails && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <h4 className="font-medium text-gray-900 mb-2">Appointment Details:</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><strong>Service:</strong> {appointmentDetails.specialty}</p>
                  <p><strong>Doctor:</strong> {appointmentDetails.doctorName}</p>
                  <p><strong>Clinic:</strong> {appointmentDetails.clinic}</p>
                  <p><strong>Date & Time:</strong> {appointmentDetails.date} at {appointmentDetails.time}</p>
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              <Button 
                className="w-full bg-red-600 hover:bg-red-700 text-white rounded-full py-3 font-medium"
                onClick={handleConfirm}
              >
                Yes, Cancel Appointment
              </Button>
              <Button 
                variant="outline" 
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 rounded-full py-3 font-medium"
                onClick={onClose}
              >
                Keep Appointment
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};