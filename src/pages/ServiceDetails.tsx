import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { BookingModal } from '@/components/BookingModal';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isAfter, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Service data with descriptions and timing
const serviceDetailsData = {
  'ecg': {
    name: 'ECG',
    specialty: 'Cardiology',
    description: 'Our cardiologists provide personalized ECG monitoring plans to help assess heart rhythm and detect irregular heartbeats. Suitable for all patients with cardiovascular concerns, with comprehensive analysis and treatment options available.',
    clinic: 'Central Medical Center',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '456 Oak Avenue, Suburb',
    schedule: {
      'Mon': '10:00 - 14:30',
      'Tue': '11:00 - 14:30', 
      'Wed': '12:00 - 14:30',
      'Thu': '10:00 - 14:30',
      'Fri': '11:00 - 14:30',
      'Sat': '13:00 - 16:30',
      'Sun': '13:00 - 16:30'
    },
    doctors: [
      {
        name: 'Dr. Ali Ashar',
        specialization: 'MD, Cardiologist - 8 yrs experience',
        
      },
      {
        name: 'Dr. Maya Patel',
        specialization: 'MD, Cardiologist - 10 yrs experience',
        
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
        specialization: 'MD, Radiologist - 12 yrs experience',
        
      }
    ]
  },
  'brain-scans': {
    name: 'Brain Scans',
    specialty: 'Neurology',
    description: 'Our neurologists provide advanced brain imaging and scanning services to help diagnose neurological conditions. Comprehensive analysis with detailed reports and treatment recommendations.',
    clinic: 'Maple Leaf Center',
    clinicLogo: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '456 Oak Avenue, Suburb',
    schedule: {
      'Mon': 'Closed',
      'Tue': '11:00 - 16:00', 
      'Wed': '12:00 - 16:00',
      'Thu': '11:00 - 16:00',
      'Fri': '12:00 - 16:00',
      'Sat': '13:00 - 16:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Tom Yaeghn',
        specialization: 'MD, Neurologist - 15 yrs experience',
        
      },
      {
        name: 'Dr. Lisa Chen',
        specialization: 'MD, Neurologist - 8 yrs experience',
        
      }
    ]
  },
  'retinal-care': {
    name: 'Retinal Care',
    specialty: 'Ophthalmology',
    description: 'Our ophthalmologists provide specialized retinal care services to help maintain and improve eye health. Comprehensive eye examinations with advanced diagnostic equipment.',
    clinic: 'Cedar Medical',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '456 Oak Avenue, Suburb',
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
        specialization: 'MD, Ophthalmologist - 20 yrs experience',
        
      }
    ]
  },
  'ultrasound': {
    name: 'Ultrasound',
    specialty: 'General Medicine',
    description: 'Our medical professionals provide comprehensive ultrasound imaging services for various diagnostic purposes. Safe, non-invasive procedures with immediate results and detailed analysis.',
    clinic: 'Cedar Medical',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '456 Oak Avenue, Suburb',
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
        specialization: 'MD, Ultrasonographer - 10 yrs experience',
        
      }
    ]
  }
};

const ServiceDetails = () => {
  const { serviceId } = useParams();
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');

  const serviceData = serviceDetailsData[serviceId as keyof typeof serviceDetailsData];

  if (!serviceData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Service Not Found</h1>
          <p className="text-gray-600 mt-2">The requested service could not be found.</p>
        </div>
      </div>
    );
  }

  const handleBookAppointment = () => {
    setSelectedDoctor(serviceData.doctors[0]?.name || 'Available Doctor');
    setIsBookingModalOpen(true);
  };

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Service Calendar Component
const ServiceCalendar: React.FC<{ 
  serviceData: any, 
  onDateSelect: (doctorName?: string, selectedDate?: Date) => void 
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
    // Check if the service is available on this day
    const dayName = format(date, 'EEE');
    const schedule = serviceData.schedule[dayName];
    
    if (schedule && schedule !== 'Closed' && isAfter(date, startOfDay(new Date()))) {
      setSelectedDate(date);
      onDateSelect(undefined, date);
    }
  };

  const isDateAvailable = (date: Date) => {
    const dayName = format(date, 'EEE');
    const schedule = serviceData.schedule[dayName];
    return schedule && schedule !== 'Closed' && isAfter(date, startOfDay(new Date()));
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const allDaysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad the beginning of the month to start on Monday
  const startDay = monthStart.getDay();
  const paddingDays = startDay === 0 ? 6 : startDay - 1; // Convert Sunday (0) to 6, others subtract 1
  
  const paddedDays = [];
  for (let i = paddingDays; i > 0; i--) {
    const paddingDate = new Date(monthStart);
    paddingDate.setDate(paddingDate.getDate() - i);
    paddedDays.push(paddingDate);
  }

  const calendarDays = [...paddedDays, ...allDaysInMonth];

  return (
    <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-gray-200 rounded-full transition-colors"
        >
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
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
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
        {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
          <div key={day} className="text-center py-2">
            <span className="text-xs sm:text-sm font-medium text-gray-600">{day}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {calendarDays.map((date, index) => {
          const isCurrentMonth = isSameMonth(date, currentDate);
          const isAvailable = isDateAvailable(date);
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const isToday = isSameDay(date, new Date());

          return (
            <button
              key={index}
              onClick={() => handleDateClick(date)}
              disabled={!isAvailable || !isCurrentMonth}
              className={`
                aspect-square p-1 sm:p-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200
                ${!isCurrentMonth 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : isAvailable
                    ? `cursor-pointer hover:bg-blue-100 ${
                        isSelected 
                          ? 'bg-blue-600 text-white shadow-md' 
                          : isToday 
                            ? 'bg-blue-100 text-blue-600 border-2 border-blue-300'
                            : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300'
                      }`
                    : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                }
              `}
            >
              {format(date, 'd')}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-600 rounded"></div>
          <span className="text-gray-600">Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-white border border-gray-200 rounded"></div>
          <span className="text-gray-600">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-100 rounded"></div>
          <span className="text-gray-600">Unavailable</span>
        </div>
      </div>

      {/* Selected Date Info */}
      {selectedDate && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm font-medium text-blue-900">
            Selected Date: {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </div>
          <div className="text-sm text-blue-700 mt-1">
            Available Time: {serviceData.schedule[format(selectedDate, 'EEE')]}
          </div>
        </div>
      )}
    </div>
  );
};

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="max-w-3xl">
            {/* Service Info */}
            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={serviceData.clinicLogo}
                  alt={`${serviceData.clinic} logo`}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{serviceData.name}</h1>
                  <p className="text-green-600 font-medium">{serviceData.specialty}</p>
                  <p className="text-gray-600 text-sm">{serviceData.clinic}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-600 mb-4">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span>{serviceData.address}</span>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed">{serviceData.description}</p>
            </div>
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
            onDateSelect={handleBookAppointment}
          />
        </div>
      </section>

      {/* Our Doctors Section */}
      <section className="py-12 px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Our Doctors</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {serviceData.doctors.map((doctor, index) => (
              <div key={index} className="bg-white rounded-lg p-6 shadow-sm border">
                <div className="text-center">
                  <h3 className="font-semibold text-gray-900 text-lg mb-2">{doctor.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{doctor.specialization}</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Single Book Now Button for the Service */}
          <div className="text-center mt-8">
            <Button 
              size="lg"
              onClick={() => handleBookAppointment()}
              className="px-12 py-4 text-lg font-semibold"
            >
              Book Now - {serviceData.name}
            </Button>
          </div>
        </div>
      </section>

      <BookingModal 
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        doctorName={selectedDoctor}
        clinicName={serviceData.clinic}
      />
    </div>
  );
};

export default ServiceDetails;