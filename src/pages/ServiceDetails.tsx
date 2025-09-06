import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import BookingConfirmationModal from '@/components/BookingConfirmationModal';
import TimeSlotModal from '@/components/TimeSlotModal';
import { AuthPromptModal } from '@/components/AuthPromptModal';
import { useBooking } from '@/contexts/BookingContext';
import { useAuth } from '@/contexts/AuthContext';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isAfter, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Service data with descriptions and timing
const serviceDatabase = {
  'ecg': {
    name: 'ECG',
    specialty: 'Cardiology',
    description: 'Our cardiologists provide personalized ECG monitoring plans to help assess heart rhythm and detect irregular heartbeats. Suitable for all patients with cardiovascular concerns, with comprehensive analysis and treatment options available.',
    clinic: 'Central Medical Center',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '456 Oak Avenue, Suburb',
    schedule: {
      'Mon': '09:00 - 13:00',
      'Tue': '10:00 - 14:00', 
      'Wed': '09:00 - 13:00',
      'Thu': '10:00 - 14:30',
      'Fri': '11:00 - 14:30',
      'Sat': '13:00 - 16:30',
      'Sun': '13:00 - 16:30'
    },
    doctors: [
      {
        name: 'Dr. Ali Ashar',
        specialization: 'MD, Cardiologist - 8 yrs experience'
      },
      {
        name: 'Dr. Maya Patel',
        specialization: 'MD, Cardiologist - 10 yrs experience'
      }
    ]
  },
  'x-ray': {
    name: 'X-Ray',
    specialty: 'Radiology',
    description: 'Our radiologists provide comprehensive X-ray imaging services to help diagnose various medical conditions. State-of-the-art equipment ensures accurate results with minimal radiation exposure.',
    clinic: 'Willow Grove Clinic',
    clinicLogo: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '456 Oak Avenue, Suburb',
    schedule: {
      'Mon': '09:00 - 13:00',
      'Tue': '10:00 - 14:00', 
      'Wed': '09:00 - 13:00',
      'Thu': '10:00 - 14:00',
      'Fri': '09:00 - 13:00',
      'Sat': '10:00 - 14:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Sarah Johnson',
        specialization: 'MD, Radiologist - 12 yrs experience'
      }
    ]
  },
  'brain-scans': {
    name: 'Brain Scans',
    specialty: 'Neurology',
    description: 'Our neurologists provide advanced brain imaging and scanning services to help diagnose neurological conditions. Comprehensive analysis with detailed reports and treatment recommendations.',
    clinic: 'Maple Leaf Center',
    clinicLogo: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '789 Pine Street, Downtown',
    schedule: {
      'Mon': '10:00 - 15:00',
      'Tue': '11:00 - 16:00',
      'Wed': '10:00 - 15:00',
      'Thu': '11:00 - 16:00',
      'Fri': '12:00 - 16:00',
      'Sat': '13:00 - 16:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Tom Yaeghn',
        specialization: 'MD, Neurologist - 15 yrs experience'
      },
      {
        name: 'Dr. Lisa Chen',
        specialization: 'MD, Neurologist - 8 yrs experience'
      }
    ]
  },
  'retinal-care': {
    name: 'Retinal Care',
    specialty: 'Ophthalmology',
    description: 'Our ophthalmologists provide specialized retinal care services to help maintain and improve eye health. Comprehensive eye examinations with advanced diagnostic equipment.',
    clinic: 'Cedar Medical',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '321 Elm Road, Uptown',
    schedule: {
      'Mon': '08:00 - 15:00',
      'Tue': '09:00 - 15:00',
      'Wed': '08:00 - 15:00',
      'Thu': '09:00 - 15:00',
      'Fri': '08:00 - 15:00',
      'Sat': 'Closed',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Michael Roberts',
        specialization: 'MD, Ophthalmologist - 20 yrs experience'
      }
    ]
  },
  'ultrasound': {
    name: 'Ultrasound',
    specialty: 'General Medicine',
    description: 'Our medical professionals provide comprehensive ultrasound imaging services for various diagnostic purposes. Safe, non-invasive procedures with immediate results and detailed analysis.',
    clinic: 'Cedar Medical',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '321 Elm Road, Uptown',
    schedule: {
      'Mon': '08:00 - 15:00',
      'Tue': '09:00 - 15:00',
      'Wed': '08:00 - 15:00',
      'Thu': '09:00 - 15:00',
      'Fri': '08:00 - 15:00',
      'Sat': 'Closed',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Jennifer White',
        specialization: 'MD, Ultrasonographer - 10 yrs experience'
      }
    ]
  },
  'acne-treatment': {
    name: 'Acne Treatment',
    specialty: 'Dermatology',
    description: 'Our dermatologists provide comprehensive acne treatment services using the latest medical techniques and therapies. Personalized treatment plans to help clear your skin and prevent future breakouts.',
    clinic: 'Central Medical Center',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '456 Oak Avenue, Suburb',
    schedule: {
      'Mon': '09:00 - 17:00',
      'Tue': '10:00 - 18:00',
      'Wed': '09:00 - 17:00',
      'Thu': '10:00 - 18:00',
      'Fri': '09:00 - 17:00',
      'Sat': '10:00 - 14:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Sarah Johnson',
        specialization: 'MD, Dermatologist - 12 yrs experience'
      },
      {
        name: 'Dr. Michael Chen',
        specialization: 'MD, Dermatologist - 8 yrs experience'
      }
    ]
  }
};

const ServiceDetails = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addAppointment, confirmAppointment } = useBooking();
  const [isBookingConfirmationOpen, setIsBookingConfirmationOpen] = useState(false);
  const [isTimeSlotModalOpen, setIsTimeSlotModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [pendingBookingId, setPendingBookingId] = useState<string>('');
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);

  const serviceData = serviceDatabase[serviceId as keyof typeof serviceDatabase];

  if (!serviceData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Service not found</h1>
          <p className="text-gray-600 mt-2">The requested service could not be found.</p>
        </div>
      </div>
    );
  }

  const handleBookAppointment = () => {
    setIsBookingConfirmationOpen(true);
  };

  const handleDateSelect = (date: Date) => {
    // Check if user is authenticated before allowing date selection
    if (!user) {
      // Store the intended action for after login
      sessionStorage.setItem('pendingBooking', JSON.stringify({
        serviceId,
        date: format(date, 'yyyy-MM-dd'),
        returnTo: window.location.pathname
      }));
      setIsAuthPromptOpen(true);
      return;
    }
    
    setSelectedDate(date);
    setIsTimeSlotModalOpen(true);
  };

  const handleTimeSlotBook = async (timeSlot: string) => {
    // Double-check authentication before booking
    if (!user) {
      setIsAuthPromptOpen(true);
      return;
    }
    
    setSelectedTimeSlot(timeSlot);
    setIsTimeSlotModalOpen(false);
    
    // Create pending booking
    if (selectedDate && serviceData) {
      try {
        const bookingId = await addAppointment({
          doctorName: serviceData.doctors[0]?.name || 'Available Doctor',
          specialty: serviceData.name,
          clinic: serviceData.clinic,
          date: format(selectedDate, 'yyyy-MM-dd'),
          time: timeSlot,
          status: 'pending'
        });
        
        setPendingBookingId(bookingId);
        setIsBookingConfirmationOpen(true);
      } catch (error) {
        console.error('Error booking appointment:', error);
      }
    }
  };

  const handleConfirmBooking = async () => {
    if (pendingBookingId) {
      try {
        await confirmAppointment(pendingBookingId);
        setPendingBookingId('');
      } catch (error) {
        console.error('Error confirming appointment:', error);
      }
    }
  };

  // Generate time slots based on service schedule
  const getTimeSlots = (date: Date) => {
    const dayName = format(date, 'EEE');
    const schedule = serviceData.schedule[dayName];
    
    if (!schedule || schedule === 'Closed') return [];
    
    // Parse schedule like "09:00 - 13:00"
    const [startTime, endTime] = schedule.split(' - ');
    const slots = [];
    
    // Generate 30-minute slots
    let current = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);
    
    while (current < end) {
      slots.push(format(current, 'h:mma'));
      current.setMinutes(current.getMinutes() + 30);
    }
    
    return slots;
  };

// Service Calendar Component
const ServiceCalendar: React.FC<{ 
  serviceData: any, 
  onDateSelect: (date: Date) => void 
}> = ({ serviceData, onDateSelect }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleDateClick = (date: Date) => {
    // Check if the service is available on this day (excluding Sundays)
    const dayName = format(date, 'EEE');
    const schedule = serviceData.schedule[dayName];
    
    if (schedule && schedule !== 'Closed' && dayName !== 'Sun' && isAfter(date, startOfDay(new Date()))) {
      onDateSelect(date);
    }
  };

  const isDateAvailable = (date: Date) => {
    const dayName = format(date, 'EEE');
    const schedule = serviceData.schedule[dayName];
    // Exclude Sundays and past days
    return schedule && schedule !== 'Closed' && dayName !== 'Sun' && isAfter(date, startOfDay(new Date()));
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const allDaysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad the beginning of the month to start on Monday
  const startDay = monthStart.getDay();
  const paddingDays = startDay === 0 ? 6 : startDay - 1;
  
  const paddedDays = [];
  for (let i = paddingDays; i > 0; i--) {
    const paddingDate = new Date(monthStart);
    paddingDate.setDate(paddingDate.getDate() - i);
    paddedDays.push(paddingDate);
  }

  const calendarDays = [...paddedDays, ...allDaysInMonth];

  return (
    <div className="bg-gray-50 rounded-lg p-3 sm:p-4 max-w-2xl">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-gray-200 rounded-full transition-colors"
        >
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">
          {format(currentDate, 'MMMM yyyy')}
        </h3>
        
        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-gray-200 rounded-full transition-colors"
        >
          <ChevronRight size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
          <div key={day} className="text-center py-1">
            <span className="text-xs sm:text-sm font-medium text-gray-600">{day}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, index) => {
          const isCurrentMonth = isSameMonth(date, currentDate);
          const isAvailable = isDateAvailable(date);

          return (
            <button
              key={index}
              onClick={() => handleDateClick(date)}
              disabled={!isAvailable || !isCurrentMonth}
              className={`
                aspect-square p-1 rounded-full text-sm transition-all duration-200 min-h-[28px] sm:min-h-[32px]
                ${!isCurrentMonth 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : isAvailable
                    ? 'cursor-pointer bg-blue-100 border-2 border-blue-300 text-blue-800 font-bold hover:bg-blue-200 hover:border-blue-400 shadow-sm'
                    : 'text-gray-400 cursor-not-allowed font-normal'
                }
              `}
            >
              {format(date, 'd')}
            </button>
          );
        })}
      </div>

    </div>
  );
};

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Blue Header Section with Clinic and Service Info */}
      <section className="bg-[#0C2243] text-white py-8 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Clinic Info */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <img
                src={serviceData.clinicLogo}
                alt={`${serviceData.clinic} logo`}
                className="w-6 h-6 rounded object-cover"
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{serviceData.clinic}</h2>
              <div className="flex items-center gap-2 text-sm text-gray-200">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span>{serviceData.address}</span>
              </div>
            </div>
          </div>

          {/* Service Info */}
          <div className="mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">{serviceData.name}</h1>
            <div className="inline-block bg-white/20 px-3 py-1 rounded-full text-sm font-medium mb-4">
              {serviceData.specialty}
            </div>
            <p className="text-gray-200 leading-relaxed max-w-2xl">
              {serviceData.description}
            </p>
          </div>
        </div>
      </section>

      {/* Service Timing Section */}
      <section className="py-8 px-4 sm:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Service Timing</h2>
          
          {/* Calendar Component */}
          <ServiceCalendar 
            serviceData={serviceData}
            onDateSelect={handleDateSelect}
          />
        </div>
      </section>

      {/* Our Doctors Section */}
      <section className="py-8 px-4 sm:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Our Doctors</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {serviceData.doctors.map((doctor, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{doctor.name}</h3>
                    <p className="text-sm text-gray-600">{doctor.specialization}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <BookingConfirmationModal
        isOpen={isBookingConfirmationOpen}
        onClose={() => setIsBookingConfirmationOpen(false)}
        onConfirm={handleConfirmBooking}
        bookingDetails={{
          date: selectedDate ? format(selectedDate, 'MMMM d, yyyy') : '',
          time: selectedTimeSlot,
          service: serviceData.name,
          clinic: serviceData.clinic
        }}
      />

      <TimeSlotModal
        isOpen={isTimeSlotModalOpen}
        onClose={() => setIsTimeSlotModalOpen(false)}
        selectedDate={selectedDate}
        timeSlots={selectedDate ? getTimeSlots(selectedDate) : []}
        onBookAppointment={handleTimeSlotBook}
      />

      <AuthPromptModal
        isOpen={isAuthPromptOpen}
        onClose={() => setIsAuthPromptOpen(false)}
      />
    </div>
  );
};

export default ServiceDetails;