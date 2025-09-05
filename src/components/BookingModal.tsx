import React, { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useBooking } from '@/contexts/BookingContext';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorName?: string;
  clinicName?: string;
  serviceName?: string;
}

interface TimeSlot {
  time: string;
  doctor: string;
  available: boolean;
}

const timeSlots: TimeSlot[] = [
  { time: '5:00am', doctor: 'Dr Ishfaq', available: true },
  { time: '6:00am', doctor: 'Dr Ishfaq', available: true },
  { time: '7:00am', doctor: 'Dr Ishfaq', available: true },
  { time: '8:00am', doctor: 'Dr Ishfaq', available: true },
  { time: '9:00am', doctor: 'Dr Ishfaq', available: false },
  { time: '10:00am', doctor: 'Dr Ishfaq', available: true },
  { time: '11:00am', doctor: 'Dr Ishfaq', available: true },
  { time: '12:00pm', doctor: 'Dr Ishfaq', available: true },
  { time: '1:00pm', doctor: 'Dr Ishfaq', available: true },
  { time: '2:00pm', doctor: 'Dr Ishfaq', available: false },
  { time: '3:00pm', doctor: 'Dr Ishfaq', available: true },
  { time: '4:00pm', doctor: 'Dr Ishfaq', available: true },
];

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  doctorName = 'Dr Ishfaq',
  clinicName = 'Central Medical Center',
  serviceName = 'General Consultation'
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [step, setStep] = useState<'date' | 'confirmation'>('date');
  const { addAppointment } = useBooking();
  const navigate = useNavigate();

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    
    // Save the appointment
    if (selectedDate) {
      const appointmentDate = format(selectedDate, 'yyyy-MM-dd');
      console.log('Saving appointment with date:', appointmentDate, 'time:', time);
      
      addAppointment({
        doctorName: doctorName,
        specialty: serviceName,
        clinic: clinicName,
        date: appointmentDate,
        time: time,
        status: 'upcoming',
        
      });
    }
    
    setStep('confirmation');
  };

  const handleClose = () => {
    setStep('date');
    setSelectedDate(undefined);
    setSelectedTime('');
    onClose();
  };

  const handleBookAnother = () => {
    handleClose();
    navigate('/my-bookings');
  };

  if (step === 'confirmation') {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg mx-auto bg-white rounded-2xl p-0 overflow-hidden">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 z-10"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
            
            <div className="text-center py-12 px-8">
              <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Booking Successful
              </h2>
              
              <div className="text-gray-600 mb-8 space-y-1">
                <p>Your appointment has been confirmed for {selectedDate && format(selectedDate, 'MMMM d, yyyy')} at {selectedTime}</p>
                <p className="text-sm"><strong>Service:</strong> {serviceName}</p>
                <p className="text-sm"><strong>Clinic:</strong> {clinicName}</p>
              </div>
              
              <div className="space-y-3">
                <Button 
                  className="w-full bg-[rgba(12,34,67,1)] hover:bg-[rgba(12,34,67,0.9)] text-white rounded-full py-3"
                  onClick={handleClose}
                >
                  Done
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full rounded-full py-3"
                  onClick={handleBookAnother}
                >
                  View Bookings
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl mx-auto bg-white rounded-2xl p-0 overflow-hidden">
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 z-10"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
          
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-xl font-semibold text-center">
              Select a Date & Time
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Calendar Section */}
              <div className="flex flex-col items-center">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedDate ? format(selectedDate, 'MMMM yyyy') : 'April 2024'}
                  </h3>
                </div>
                
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  className={cn("p-3 pointer-events-auto border rounded-lg")}
                  classNames={{
                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                    month: "space-y-4",
                    caption: "flex justify-center pt-1 relative items-center",
                    caption_label: "text-sm font-medium",
                    nav: "space-x-1 flex items-center",
                    nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex",
                    head_cell: "text-gray-500 rounded-md w-9 font-normal text-[0.8rem]",
                    row: "flex w-full mt-2",
                    cell: cn(
                      "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent",
                      "h-9 w-9"
                    ),
                    day: cn(
                      "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-100 rounded-md",
                      "focus:bg-accent focus:text-accent-foreground"
                    ),
                    day_selected: "bg-[rgba(12,34,67,1)] text-white hover:bg-[rgba(12,34,67,0.9)] hover:text-white focus:bg-[rgba(12,34,67,1)] focus:text-white",
                    day_today: "bg-gray-100 text-gray-900",
                    day_outside: "text-gray-400 opacity-50",
                    day_disabled: "text-gray-400 opacity-50",
                    day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                    day_hidden: "invisible",
                  }}
                />
              </div>
              
              {/* Time Slots Section */}
              <div className="flex flex-col">
                <div className="border-l pl-8">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {selectedDate ? format(selectedDate, 'EEEE, MMM d') : 'Sunday, Apr 21'}
                    </h3>
                  </div>
                  
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {timeSlots.map((slot, index) => (
                      <button
                        key={index}
                        onClick={() => slot.available && handleTimeSelect(slot.time)}
                        disabled={!slot.available}
                        className={cn(
                          "w-full p-3 rounded-lg border text-left transition-colors",
                          slot.available
                            ? "border-gray-200 hover:border-[rgba(12,34,67,1)] hover:bg-blue-50 cursor-pointer"
                            : "border-gray-100 bg-gray-50 cursor-not-allowed opacity-50"
                        )}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-gray-900">{slot.time}</div>
                          </div>
                          {slot.available && (
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};