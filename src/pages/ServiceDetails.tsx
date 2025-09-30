import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import BookingConfirmationModal from '@/components/BookingConfirmationModal';
import TimeSlotModal from '@/components/TimeSlotModal';
import { AuthPromptModal } from '@/components/AuthPromptModal';
import ServiceCalendar from '@/components/ServiceCalendar';
import { useBooking } from '@/contexts/BookingContext';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays, subDays, isToday, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

import { getClinicByServiceId, getServiceById } from '@/data/clinicsData';
import Image5 from '../assets/image 5.svg';

// Generate service database dynamically from clinic data
const generateServiceDatabase = () => {
  const database: any = {};
  
  // Default schedule for all services
  const defaultSchedule = {
    'Mon': '09:00 - 17:00',
    'Tue': '09:00 - 17:00', 
    'Wed': '09:00 - 17:00',
    'Thu': '09:00 - 17:00',
    'Fri': '09:00 - 17:00',
    'Sat': '09:00 - 14:00',
    'Sun': 'Closed'
  };

  // Default doctors for different specialties
  const getDefaultDoctors = (category: string) => {
    const doctorsByCategory: { [key: string]: any[] } = {
      'Dental': [
        { name: 'Dr. Ahmad Dental', specialization: 'DDS, General Dentist - 10 yrs experience' },
        { name: 'Dr. Fatima Teeth', specialization: 'DDS, Oral Surgeon - 12 yrs experience' }
      ],
      'Dermatology': [
        { name: 'Dr. Skin Expert', specialization: 'MD, Dermatologist - 15 yrs experience' },
        { name: 'Dr. Beauty Care', specialization: 'MD, Cosmetic Dermatologist - 8 yrs experience' }
      ],
      'Orthodontics': [
        { name: 'Dr. Straight Teeth', specialization: 'DDS, Orthodontist - 12 yrs experience' }
      ],
      'Dental Implants': [
        { name: 'Dr. Implant Pro', specialization: 'DDS, Oral Surgeon - 15 yrs experience' }
      ],
      'Pediatric Dentistry': [
        { name: 'Dr. Kids Smile', specialization: 'DDS, Pediatric Dentist - 10 yrs experience' }
      ],
      'Fixed & Removable Prosthodontics': [
        { name: 'Dr. Prosthetic Expert', specialization: 'DDS, Prosthodontist - 14 yrs experience' }
      ],
      'Restorative & Cosmetic Dentistry': [
        { name: 'Dr. Cosmetic Smile', specialization: 'DDS, Cosmetic Dentist - 11 yrs experience' }
      ],
      'Root Canal & Endodontics': [
        { name: 'Dr. Root Expert', specialization: 'DDS, Endodontist - 13 yrs experience' }
      ],
      'Periodontal Treatment': [
        { name: 'Dr. Gum Care', specialization: 'DDS, Periodontist - 9 yrs experience' }
      ],
      'Oral & Maxillofacial Surgery': [
        { name: 'Dr. Jaw Surgeon', specialization: 'DDS, Oral Surgeon - 18 yrs experience' }
      ],
      'General Dentistry': [
        { name: 'Dr. General Care', specialization: 'DDS, General Dentist - 12 yrs experience' }
      ]
    };

    return doctorsByCategory[category] || [
      { name: 'Dr. Available Doctor', specialization: 'MD, Specialist - 8 yrs experience' }
    ];
  };

  // Generate descriptions for different services
  const getServiceDescription = (serviceName: string, category: string) => {
    const descriptions: { [key: string]: string } = {
      // Dermatology Services
      'Acne Treatment': 'Comprehensive acne treatment using the latest dermatological techniques. Personalized treatment plans for clear, healthy skin.',
      'Skin Consultation': 'Professional skin assessment and consultation with experienced dermatologists. Get expert advice for your skin concerns.',
      'Mole Removal': 'Safe and effective mole removal procedures performed by qualified dermatologists. Minimal scarring with excellent results.',
      'Skin Cancer Screening': 'Thorough skin cancer screening and early detection services. Regular check-ups for skin health and cancer prevention.',
      'Psoriasis Treatment': 'Specialized psoriasis treatment options to manage symptoms and improve quality of life. Advanced treatment protocols.',
      'Eczema Treatment': 'Comprehensive eczema management and treatment plans. Relief from symptoms with personalized care approaches.',
      'Dermatitis Treatment': 'Effective dermatitis treatment using proven dermatological methods. Relief from inflammation and irritation.',
      'Skin Biopsy': 'Professional skin biopsy procedures for accurate diagnosis. Performed by experienced dermatologists with precision.',
      
      // Dental Services
      'Teeth Whitening': 'Professional teeth whitening services to brighten your smile. Safe and effective whitening treatments.',
      'Teeth Cleaning': 'Comprehensive dental cleaning services to maintain optimal oral health. Professional deep cleaning and maintenance.',
      'Polishing & Scaling': 'Professional dental polishing and scaling to remove tartar and plaque. Essential for maintaining healthy teeth and gums.',
      'Dental Fillings': 'High-quality dental fillings using the latest materials. Restore damaged teeth with natural-looking results.',
      'Dentures': 'Custom-made dentures for complete or partial tooth replacement. Comfortable and natural-looking solutions.',
      'Orthodontics': 'Comprehensive orthodontic treatment to straighten teeth and improve bite alignment. Modern braces and clear aligners available.',
      
      // Default description
      'default': `Professional ${serviceName.toLowerCase()} services provided by our experienced medical team. Quality care with personalized treatment plans tailored to your specific needs.`
    };

    return descriptions[serviceName] || descriptions['default'];
  };

  // Import clinic data and generate service entries
  import('@/data/clinicsData').then(({ clinicsData }) => {
    clinicsData.forEach(clinic => {
      Object.entries(clinic.categories).forEach(([categoryName, services]) => {
        services.forEach(service => {
          database[service.id] = {
            name: service.name,
            specialty: categoryName,
            description: getServiceDescription(service.name, categoryName),
            clinic: clinic.name,
            clinicLogo: clinic.logo,
            address: clinic.address,
            schedule: defaultSchedule,
            doctors: getDefaultDoctors(categoryName)
          };
        });
      });
    });
  });

  return database;
};

// Create service database
const serviceDatabase = generateServiceDatabase();

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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDisplayDate, setSelectedDisplayDate] = useState(new Date());

  // Get service and clinic data
  const service = getServiceById(serviceId || '');
  const clinic = getClinicByServiceId(serviceId || '');
  
  if (!service || !clinic) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Service not found</h1>
          <p className="text-gray-600 mt-2">The requested service could not be found.</p>
        </div>
      </div>
    );
  }

  // Create service data object for compatibility
  const serviceData = {
    name: service.name,
    specialty: service.category,
    description: `Professional ${service.name.toLowerCase()} services provided by our experienced medical team. Quality care with personalized treatment plans tailored to your specific needs.`,
    clinic: clinic.name,
    clinicLogo: clinic.logo,
    address: clinic.address,
    schedule: {
      'Mon': '09:00 - 17:00',
      'Tue': '09:00 - 17:00', 
      'Wed': '09:00 - 17:00',
      'Thu': '09:00 - 17:00',
      'Fri': '09:00 - 17:00',
      'Sat': '09:00 - 14:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: service.doctorName || 'Dr. Ali Ashar',
        specialization: 'MD, Specialist - 8 yrs experience',
        timeSlots: ['10:00 AM – 2:00 PM']
      },
      {
        name: 'Dr. Maya Patel',
        specialization: 'MD, Specialist - 6 yrs experience',
        timeSlots: ['5:00 PM – 7:00 PM']
      }
    ]
  };

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
        setIsBookingConfirmationOpen(false);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Blue Header Section with Clinic Info Only */}
      <section className="bg-[#0C2243] text-white py-8 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
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
        </div>
      </section>

      {/* Service Information Section - White Background */}
      <section className="py-6 px-4 sm:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{serviceData.name}</h1>
            
            <div className="inline-block bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium mb-4">
              {serviceData.specialty}
            </div>
            <p className="text-gray-600 leading-relaxed max-w-2xl">
              {serviceData.description}
            </p>
          </div>
        </div>
      </section>

      {/* Date Selection Section */}
      <section className="py-6 px-4 sm:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Please choose a date</h2>
          
          {/* Date Navigator */}
          <div className="flex items-center justify-between mb-6">
            {/* Left Arrow - Functional when not at today */}
            <button
              onClick={() => setSelectedDisplayDate(subDays(selectedDisplayDate, 1))}
              disabled={isToday(selectedDisplayDate)}
              className={`p-2 rounded transition-colors ${
                isToday(selectedDisplayDate)
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <ChevronLeft size={20} />
            </button>
            
            {/* Current Date Display */}
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <span className="text-lg font-bold text-gray-900">
                {format(selectedDisplayDate, 'd MMM')}
              </span>
              {isToday(selectedDisplayDate) && (
                <span className="text-sm text-gray-500">Today</span>
              )}
            </button>
            
            {/* Right Arrow - Next Day */}
            <button
              onClick={() => setSelectedDisplayDate(addDays(selectedDisplayDate, 1))}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Calendar Modal */}
          {showCalendar && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-sm mx-auto m-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Select Date</h3>
                  <button
                    onClick={() => setShowCalendar(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <ServiceCalendar
                  selectedDate={selectedDisplayDate}
                  onDateSelect={(date) => {
                    setSelectedDisplayDate(date);
                    setShowCalendar(false);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Doctors Section */}
      <section className="py-6 px-4 sm:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-4">
            {serviceData.doctors.map((doctor, index) => (
              <div
                key={index}
                className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  setSelectedDoctor(doctor.name);
                  setSelectedDate(selectedDisplayDate);
                  setIsTimeSlotModalOpen(true);
                }}
              >
                <div className="flex items-center gap-4">
                  {/* Doctor Avatar */}
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  
                  {/* Doctor Info */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg">{doctor.name}</h3>
                    
                    {/* Time Slot Badge */}
                    <div className="mt-2">
                      <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                        {doctor.timeSlots[0]}
                      </span>
                    </div>
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