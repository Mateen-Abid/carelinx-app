import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ChevronLeft } from 'lucide-react';

interface TimeSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  timeSlots: string[];
  onBookAppointment: (timeSlot: string) => void;
}

const TimeSlotModal: React.FC<TimeSlotModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  timeSlots,
  onBookAppointment
}) => {
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');

  const handleTimeSlotSelect = (timeSlot: string) => {
    setSelectedTimeSlot(timeSlot);
  };

  const handleNext = () => {
    if (selectedTimeSlot) {
      onBookAppointment(selectedTimeSlot);
      onClose();
    }
  };

  if (!selectedDate) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm w-full mx-auto p-8 gap-0 bg-white rounded-2xl overflow-hidden mx-4 my-4 sm:max-w-md sm:mx-auto sm:my-8">
        {/* Header */}
        <div className="flex items-center pb-8">
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex-1 text-center">
            <h2 className="text-lg font-semibold text-gray-900">
              {format(selectedDate, 'EEEE, MMMM d')}
            </h2>
          </div>
        </div>

        {/* Time Slots */}
        <div className="pb-8 space-y-3 max-h-80 overflow-y-auto">
          {timeSlots.map((timeSlot) => (
            <button
              key={timeSlot}
              onClick={() => handleTimeSlotSelect(timeSlot)}
              className={`
                w-full p-4 rounded-lg border text-left font-medium transition-all
                ${selectedTimeSlot === timeSlot
                  ? 'border-gray-400 bg-gray-100 text-gray-900'
                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              {timeSlot}
            </button>
          ))}
        </div>

        {/* Request Appointment Button */}
        <div className="pt-0">
          <Button
            onClick={handleNext}
            disabled={!selectedTimeSlot}
            className="w-full bg-[#0C2243] hover:bg-[#0C2243]/90 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Request appointment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TimeSlotModal;