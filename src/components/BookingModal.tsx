import React, { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isAfter, startOfDay } from 'date-fns';
import { Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useBooking } from '@/contexts/BookingContext';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorName?: string;
  clinicName?: string;
  serviceName?: string;
  serviceSchedule?: Record<string, string>; // Add schedule data
  clinicServices?: Array<{id: string, name: string, category: string}>; // Add clinic services
}

interface TimeSlot {
  time: string;
  doctor: string;
  available: boolean;
}

const generateTimeSlots = (doctorName: string): TimeSlot[] => [
  { time: '5:00am', doctor: doctorName, available: true },
  { time: '6:00am', doctor: doctorName, available: true },
  { time: '7:00am', doctor: doctorName, available: true },
  { time: '8:00am', doctor: doctorName, available: true },
  { time: '9:00am', doctor: doctorName, available: false },
  { time: '10:00am', doctor: doctorName, available: true },
  { time: '11:00am', doctor: doctorName, available: true },
  { time: '12:00pm', doctor: doctorName, available: true },
  { time: '1:00pm', doctor: doctorName, available: true },
  { time: '2:00pm', doctor: doctorName, available: false },
  { time: '3:00pm', doctor: doctorName, available: true },
  { time: '4:00pm', doctor: doctorName, available: true },
];

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  doctorName = 'Dr Ishfaq',
  clinicName = 'Central Medical Center',
  serviceName = 'General Consultation',
  serviceSchedule = {},
  clinicServices = []
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedService, setSelectedService] = useState<{id: string, name: string, category: string} | null>(null);
  const [step, setStep] = useState<'service' | 'date' | 'confirmation'>('service');
  const [currentDate, setCurrentDate] = useState(new Date());
  const { addAppointment } = useBooking();
  const navigate = useNavigate();
  
  const timeSlots = generateTimeSlots(doctorName);
  
  // Debug logging for schedule data
  console.log('BookingModal - serviceSchedule:', serviceSchedule);
  console.log('BookingModal - clinicName:', clinicName);
  
  const handleDateSelect = (date: Date) => {
    console.log('Date selected:', date);
    setSelectedDate(date);
  };

  const handleTimeSelect = async (time: string) => {
    setSelectedTime(time);
    
    // Save the appointment
    if (selectedDate && selectedService) {
      const appointmentDate = format(selectedDate, 'yyyy-MM-dd');
      console.log('Saving appointment with date:', appointmentDate, 'time:', time, 'service:', selectedService.name);
      
      try {
        await addAppointment({
          doctorName: doctorName,
          specialty: selectedService.name,
          clinic: clinicName,
          date: appointmentDate,
          time: time,
          status: 'pending', // Start as pending, will be confirmed by edge function
        });
      } catch (error) {
        console.error('Error booking appointment:', error);
      }
    }
    
    setStep('confirmation');
  };

  const handleClose = () => {
    setStep('service');
    setSelectedDate(undefined);
    setSelectedTime('');
    setSelectedService(null);
    onClose();
  };

  const handleServiceSelect = (service: {id: string, name: string, category: string}) => {
    setSelectedService(service);
    setStep('date');
  };

  const handleBackToServices = () => {
    setStep('service');
  };

  const handleBookAnother = () => {
    handleClose();
    navigate('/my-bookings');
  };

  // Service Selection Step
  if (step === 'service') {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl mx-auto bg-white rounded-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
          <div className="relative flex-shrink-0">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="text-xl font-semibold text-center">
                Select a Service
              </DialogTitle>
              <p className="text-center text-gray-600 mt-2">
                Choose a service from {clinicName}
              </p>
            </DialogHeader>
          </div>
          
          <div className="p-6 flex-1 overflow-hidden">
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {clinicServices.length > 0 ? (
                clinicServices.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => handleServiceSelect(service)}
                    className="w-full p-4 rounded-lg border border-gray-200 hover:border-[#0C2243] hover:bg-blue-50 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{service.name}</h3>
                        <p className="text-sm text-gray-500">{service.category}</p>
                      </div>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No services available for this clinic.</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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
              {/* Concentric circles with checkmark */}
              <div className="relative w-24 h-24 mx-auto mb-8">
                {/* Outer circle */}
                <div className="absolute inset-0 bg-gray-100 rounded-full"></div>
                {/* Middle circle */}
                <div className="absolute inset-2 bg-gray-200 rounded-full"></div>
                {/* Inner dark circle */}
                <div className="absolute inset-4 bg-gray-800 rounded-full flex items-center justify-center">
                  {/* White circle with checkmark */}
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                    <Check className="w-5 h-5 text-gray-800" />
                  </div>
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Booking Request Sent
              </h2>
              
              {selectedService && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">Appointment Details</h3>
                  <p className="text-sm text-gray-600">
                    <strong>Service:</strong> {selectedService.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Category:</strong> {selectedService.category}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Clinic:</strong> {clinicName}
                  </p>
                  {selectedDate && (
                    <p className="text-sm text-gray-600">
                      <strong>Date:</strong> {format(selectedDate, 'EEEE, MMM d, yyyy')}
                    </p>
                  )}
                  {selectedTime && (
                    <p className="text-sm text-gray-600">
                      <strong>Time:</strong> {selectedTime}
                    </p>
                  )}
                </div>
              )}
              
              <p className="text-gray-600 mb-8 leading-relaxed">
                Your appointment booking request has been sent. We'll get back to you shortly.
              </p>
              
              <div className="space-y-4">
                <Button 
                  className="w-full bg-[#1e3a8a] hover:bg-[#1e40af] text-white rounded-full py-4 text-lg font-medium"
                  onClick={handleBookAnother}
                >
                  View Booking
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
      <DialogContent className="max-w-4xl mx-auto bg-white rounded-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="relative flex-shrink-0">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-center justify-between">
              <button
                onClick={handleBackToServices}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeft size={20} className="text-gray-600" />
              </button>
              <DialogTitle className="text-xl font-semibold text-center flex-1">
                Select a Date & Time
              </DialogTitle>
              <div className="w-10"></div> {/* Spacer for centering */}
            </div>
            {selectedService && (
              <div className="text-center mt-2">
                <p className="text-sm text-gray-600">
                  Booking: <span className="font-medium">{selectedService.name}</span>
                </p>
                <p className="text-xs text-gray-500">{selectedService.category}</p>
              </div>
            )}
          </DialogHeader>
        </div>
          
        <div className="p-3 sm:p-6 flex-1 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 h-full">
            {/* Calendar Section */}
            <div className="flex flex-col items-center">
              <div className="text-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Select Date
                </h3>
              </div>
              
              <div className="bg-white rounded-lg border p-6 max-w-md">
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-6">
                  <button
                    onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                  >
                    <ChevronLeft size={18} className="text-gray-600" />
                  </button>
                  
                  <h4 className="text-base font-medium text-gray-900">
                    {format(currentDate, 'MMMM yyyy')}
                  </h4>
                  
                  <button
                    onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                  >
                    <ChevronRight size={18} className="text-gray-600" />
                  </button>
                </div>

                {/* Day Headers */}
                <div className="grid grid-cols-7 mb-4">
                  {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
                    <div key={day} className="text-center py-3">
                      <span className="text-xs font-medium text-gray-500">{day}</span>
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-3">
                  {(() => {
                    const monthStart = startOfMonth(currentDate);
                    const monthEnd = endOfMonth(currentDate);
                    const allDaysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
                    const startDay = monthStart.getDay();
                    const paddingDays = startDay === 0 ? 6 : startDay - 1;
                    const paddedDays = [];
                    
                    for (let i = paddingDays; i > 0; i--) {
                      const paddingDate = new Date(monthStart);
                      paddingDate.setDate(paddingDate.getDate() - i);
                      paddedDays.push(paddingDate);
                    }
                    
                    const calendarDays = [...paddedDays, ...allDaysInMonth];
                    
                    return calendarDays.map((date, index) => {
                      const isCurrentMonth = isSameMonth(date, currentDate);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const checkDate = new Date(date);
                      checkDate.setHours(0, 0, 0, 0);
                      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
                      
                      // Check clinic schedule availability
                      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                      const dayName = dayNames[dayOfWeek];
                      const schedule = serviceSchedule[dayName];
                      
                      // If no schedule provided, assume clinic is open on weekdays
                      let isClinicOpen = true;
                      if (Object.keys(serviceSchedule).length > 0) {
                        isClinicOpen = schedule && schedule !== 'Closed' && schedule !== '';
                      } else {
                        // Default: open Monday to Friday
                        isClinicOpen = dayOfWeek >= 1 && dayOfWeek <= 5;
                      }
                      
                      const isAvailable = isCurrentMonth && checkDate >= today && isClinicOpen;
                      
                      // Debug logging
                      if (isCurrentMonth && dayOfWeek >= 0 && dayOfWeek <= 6) {
                        console.log(`Date ${format(date, 'MMM d')}: dayOfWeek=${dayOfWeek}, isAvailable=${isAvailable}`);
                      }

                      return (
                        <div key={index} className="aspect-square p-0.5">
                          <button
                            onClick={() => isAvailable && isCurrentMonth && handleDateSelect(date)}
                            disabled={!isAvailable || !isCurrentMonth}
                            className={`
                              w-full h-full rounded-full text-sm transition-all duration-200 flex items-center justify-center
                              ${!isCurrentMonth 
                                ? 'text-gray-300 cursor-not-allowed bg-transparent' 
                                : isAvailable
                                  ? 'cursor-pointer bg-gray-100 text-gray-900 font-bold hover:bg-gray-200'
                                  : 'text-gray-400 cursor-not-allowed bg-transparent'
                              }
                            `}
                          >
                            {format(date, 'd')}
                          </button>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
            
            {/* Time Slots Section */}
            <div className="flex flex-col min-h-0">
              <div className="sm:border-l sm:pl-8 flex flex-col min-h-0">
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {selectedDate ? format(selectedDate, 'EEEE, MMM d') : 'Select a date to view available times'}
                  </h3>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2 max-h-[300px] sm:max-h-[400px]">
                  {selectedDate ? timeSlots.map((slot, index) => (
                    <button
                      key={index}
                      onClick={() => slot.available && handleTimeSelect(slot.time)}
                      disabled={!slot.available}
                      className={cn(
                        "w-full p-3 rounded-lg border text-left transition-colors sm:block",
                        "sm:p-3 p-2 h-auto sm:h-auto",
                        slot.available
                          ? "border-gray-200 hover:border-[rgba(12,34,67,1)] hover:bg-blue-50 cursor-pointer"
                          : "border-gray-100 bg-gray-50 cursor-not-allowed opacity-50"
                      )}
                    >
                      {/* Mobile compact layout */}
                      <div className="sm:hidden flex items-center gap-3 w-full">
                        {/* Left side - Medical icon */}
                        <div className="w-6 h-6 bg-[#0C2243] flex items-center justify-center rounded shrink-0">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                          </svg>
                        </div>
                        
                        {/* Right side - Time info */}
                        <div className="min-w-0 flex-1">
                          <div className="text-black text-sm font-medium mb-1">
                            {slot.doctor}
                          </div>
                          <div className="text-gray-600 text-xs">
                            {slot.time}
                          </div>
                        </div>
                        
                        {slot.available && (
                          <div className="w-2 h-2 bg-green-500 rounded-full shrink-0"></div>
                        )}
                      </div>

                      {/* Desktop layout */}
                      <div className="hidden sm:flex justify-between items-center">
                        <div>
                          <div className="font-medium text-gray-900">{slot.time}</div>
                        </div>
                        {slot.available && (
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        )}
                      </div>
                    </button>
                  )) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>Please select a date to view available time slots</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};