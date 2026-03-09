import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import BookingConfirmationModal from '@/components/BookingConfirmationModal';
import TimeSlotModal from '@/components/TimeSlotModal';
import { AuthPromptModal } from '@/components/AuthPromptModal';
import ServiceCalendar from '@/components/ServiceCalendar';
import { useBooking } from '@/contexts/BookingContext';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays, subDays, isToday, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { api } from '@/services/api';
import { useTranslation } from 'react-i18next';

import { getClinicByServiceId, getServiceById, clinicsData } from '@/data/clinicsData';
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
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';

  const formatTime = (date: Date) =>
    new Intl.DateTimeFormat(isRtl ? 'ar' : 'en', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);

  const formatDisplayDate = (date: Date) =>
    new Intl.DateTimeFormat(isRtl ? 'ar' : 'en', {
      day: 'numeric',
      month: 'short',
    }).format(date);

  const localizeTimeString = (timeStr: string) => {
    if (!isRtl) return timeStr;
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return timeStr;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const meridiem = match[3].toUpperCase();

    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;

    return formatTime(new Date(2000, 0, 1, hours, minutes));
  };

  const localizeTimeRange = (range: string) => {
    if (!isRtl) return range;
    const normalized = range.replace('–', '-');
    const parts = normalized.split('-').map((part) => part.trim());
    if (parts.length !== 2) return range;
    return `${localizeTimeString(parts[0])} - ${localizeTimeString(parts[1])}`;
  };
  const location = useLocation();
  const { user } = useAuth();
  const { addAppointment } = useBooking();
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
  
  // Database service state
  const [databaseService, setDatabaseService] = useState<any>(null);
  const [databaseClinic, setDatabaseClinic] = useState<any>(null);
  const [databaseDoctors, setDatabaseDoctors] = useState<Array<{id: string, name: string, specialty: string, email: string | null, phone: string | null, availability: string | null, services?: string | null, price?: string | number | null}>>([]);
  const [loading, setLoading] = useState(true);

  // Check if serviceId is a database service (starts with "doctor-")
  const isDatabaseService = serviceId?.startsWith('doctor-');
  // Parse serviceId format: doctor-{doctorId}-{service-name}
  // UUID format is: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars including dashes)
  // So we extract first 36 chars after "doctor-" as doctorId, rest is service name
  let doctorId: string | null = null;
  let serviceNameFromId: string | null = null;
  
  if (isDatabaseService && serviceId) {
    const withoutPrefix = serviceId.replace('doctor-', '');
    // UUID is 36 characters (including dashes)
    // Check if there's a service name after the UUID
    const uuidMatch = withoutPrefix.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:-(.+))?$/i);
    if (uuidMatch) {
      doctorId = uuidMatch[1];
      serviceNameFromId = uuidMatch[2] || null;
    } else {
      // Fallback: if no UUID match, try to extract first part as doctorId
      // This handles old format: doctor-{doctorId}
      doctorId = withoutPrefix.split('-')[0];
    }
  }

  // Fetch database service data and all doctors providing this service
  useEffect(() => {
    const fetchDatabaseService = async () => {
      // Reset loading state
      setLoading(true);
      
      if (!isDatabaseService) {
        // For hardcoded services, loading is complete immediately
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Extract service name from serviceId
        const serviceName = serviceNameFromId 
          ? serviceNameFromId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
          : null;

        console.log('🔍 Fetching database service:', { serviceId, serviceName, doctorId });

        // Get clinicId from location state (passed from navigation) or from doctor
        let clinicId: string | null = null;
        
        if (location.state?.clinicId) {
          clinicId = location.state.clinicId;
          // Check if it's a UUID (database clinic) or a name (hardcoded clinic)
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clinicId);
          if (!isUUID) {
            // If it's a clinic name (hardcoded clinic), fetch all clinics and find by name
            try {
              const { clinics } = await api.clinics.getClinics();
              const clinicByName = clinics?.find((c: any) => c.name === clinicId && c.status === 'active');
              if (clinicByName) {
                clinicId = clinicByName.id;
              }
            } catch (error) {
              console.error('Error finding clinic by name:', error);
            }
          }
        }
        
        // Fallback: fetch from doctor if clinicId not found
        if (!clinicId && doctorId) {
          try {
            // Fetch all doctors and find the one with matching ID
            const { doctors } = await api.doctors.getDoctors();
            const firstDoctor = doctors?.find((d: any) => d.id === doctorId);
            clinicId = firstDoctor?.clinic_id || null;
          } catch (error) {
            console.error('Error finding doctor:', error);
          }
        }

        if (!clinicId) {
          console.error('❌ Clinic ID not found');
          setLoading(false);
          return;
        }

        // Fetch clinic from backend
        console.log('📡 Fetching clinic from backend...');
        const { clinic: clinicData } = await api.clinics.getClinic(clinicId);

        if (!clinicData) {
          console.log('❌ Clinic not found');
          setLoading(false);
          return;
        }

        console.log('✅ Fetched clinic from backend:', clinicData);
        setDatabaseClinic(clinicData);

        // Fetch ALL doctors from this clinic via backend
        console.log('📡 Fetching doctors from backend...');
        const { doctors: allDoctors } = await api.doctors.getDoctors(clinicId);

        if (!allDoctors) {
          console.error('Error fetching doctors');
          setLoading(false);
          return;
        }

        // First, get the specialty from the original doctor (to filter by specialty)
        let requiredSpecialty: string | null = null;
        if (doctorId) {
          const originalDoctor = allDoctors.find((d: any) => d.id === doctorId);
          requiredSpecialty = originalDoctor?.specialty || null;
        }

        // Filter doctors that provide this specific service AND match the specialty
        // Normalize service name for matching (case-insensitive, flexible)
        const normalizeServiceName = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');
        
        let doctorsProvidingService: typeof allDoctors = [];
        
        if (serviceName) {
          // Filter doctors whose services column contains this service name AND specialty matches
          const serviceNameNormalized = normalizeServiceName(serviceName);
          
          doctorsProvidingService = allDoctors?.filter(doctor => {
            // First check: specialty must match (if we have a required specialty)
            if (requiredSpecialty && doctor.specialty !== requiredSpecialty) {
              return false;
            }
            
            // Second check: doctor must have services
            if (!doctor.services || doctor.services.trim().length === 0) {
              return false;
            }
            
            // Third check: doctor's services must contain the service name (case-insensitive matching)
            const doctorServices = doctor.services.split(',').map(s => normalizeServiceName(s));
            return doctorServices.some(ds => {
              // Exact match or contains match
              return ds === serviceNameNormalized || 
                     ds.includes(serviceNameNormalized) || 
                     serviceNameNormalized.includes(ds);
            });
          }) || [];
        } else {
          // If no service name, filter by specialty only (if we have one)
          if (requiredSpecialty) {
            doctorsProvidingService = allDoctors?.filter(doctor => doctor.specialty === requiredSpecialty) || [];
          } else {
            // If no service name and no specialty, show all doctors from clinic (fallback)
            doctorsProvidingService = allDoctors || [];
          }
        }

        console.log('✅ Doctors providing service:', doctorsProvidingService.length, serviceName || 'all');
        setDatabaseDoctors(doctorsProvidingService);

        // Get specialty from first doctor (all should have same specialty for same service)
        const firstDoctor = doctorsProvidingService[0];
        const specialty = firstDoctor?.specialty || 'General';

        // Create service object
        setDatabaseService({
          id: serviceId,
          name: serviceName || 'General Consultation',
          category: specialty,
          doctorName: firstDoctor?.name || 'Available Doctor',
          doctorId: firstDoctor?.id || ''
        });

      } catch (error) {
        console.error('Error in fetchDatabaseService:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDatabaseService();
  }, [serviceId, isDatabaseService, doctorId, serviceNameFromId, location.state]);

  // Get service and clinic data - prioritize database, fallback to hardcoded
  const service = isDatabaseService ? databaseService : getServiceById(serviceId || '');
  const clinic = isDatabaseService ? databaseClinic : getClinicByServiceId(serviceId || '');
  
  // For hardcoded services, get all doctors who provide this service from the same clinic
  const getHardcodedDoctors = () => {
    if (isDatabaseService || !service || !clinic) return [];
    
    const doctors: Array<{name: string, specialization: string, timeSlots: string[]}> = [];
    const doctorNames = new Set<string>();
    
    // Find the clinic in clinicsData
    const hardcodedClinic = clinicsData.find(c => c.id === clinic.id);
    if (!hardcodedClinic) return [];
    
    // Find all services with the same name in this clinic
    Object.values(hardcodedClinic.categories).forEach(services => {
      services.forEach(serviceItem => {
        // If this service matches the selected service name
        if (serviceItem.name === service.name && serviceItem.doctorName) {
          // Add doctor if not already added (to avoid duplicates)
          if (!doctorNames.has(serviceItem.doctorName)) {
            doctorNames.add(serviceItem.doctorName);
            doctors.push({
              name: serviceItem.doctorName,
              specialization: `${service.category} - Specialist`,
              timeSlots: ['10:00 AM – 2:00 PM', '2:00 PM – 6:00 PM']
            });
          }
        }
      });
    });
    
    // If no doctors found, use the service's doctorName as fallback
    if (doctors.length === 0 && service.doctorName) {
      doctors.push({
        name: service.doctorName,
        specialization: `${service.category} - Specialist`,
        timeSlots: ['10:00 AM – 2:00 PM', '2:00 PM – 6:00 PM']
      });
    }
    
    // If still no doctors, use default
    if (doctors.length === 0) {
      doctors.push({
        name: 'Dr. Available Doctor',
        specialization: `${service.category} - Specialist`,
        timeSlots: ['10:00 AM – 2:00 PM']
      });
    }
    
    return doctors;
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">{t('Loading service information...')}</p>
        </div>
      </div>
    );
  }
  
  if (!service || !clinic) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">{t('Service not found')}</h1>
          <p className="text-gray-600 mt-2">{t('The requested service could not be found.')}</p>
        </div>
      </div>
    );
  }

  const translatedServiceName = t(service.name);
  const descriptionServiceName = isRtl ? translatedServiceName : translatedServiceName.toLowerCase();

  // Create service data object for compatibility
  const formatDoctorPrice = (price?: string | number | null) => {
    if (price === null || price === undefined) return null;
    const trimmed = String(price).trim();
    if (!trimmed) return null;
    const numeric = trimmed.replace(/,/g, '');
    if (/^\d+(\.\d+)?$/.test(numeric)) {
      return new Intl.NumberFormat(isRtl ? 'ar' : 'en').format(Number(numeric));
    }
    return trimmed;
  };

  const serviceData = {
    name: service.name,
    specialty: service.category,
    description: t(
      'Professional {{serviceName}} services provided by our experienced medical team. Quality care with personalized treatment plans tailored to your specific needs.',
      { serviceName: descriptionServiceName }
    ),
    clinic: isDatabaseService ? (clinic?.name || 'Clinic') : clinic.name,
    clinicLogo: isDatabaseService ? (clinic?.logo_url || '') : clinic.logo,
    address: isDatabaseService ? (clinic?.address || 'Location not specified') : clinic.address,
    schedule: {
      'Mon': '09:00 - 17:00',
      'Tue': '09:00 - 17:00', 
      'Wed': '09:00 - 17:00',
      'Thu': '09:00 - 17:00',
      'Fri': '09:00 - 17:00',
      'Sat': '09:00 - 14:00',
      'Sun': 'Closed'
    },
    doctors: isDatabaseService && databaseDoctors.length > 0 
      ? databaseDoctors.map(doctor => ({
          name: doctor.name,
          specialization: `${doctor.specialty || 'General'} - Specialist`,
          timeSlots: doctor.availability 
            ? [doctor.availability] 
            : ['10:00 AM – 2:00 PM', '2:00 PM – 6:00 PM'],
          doctorId: doctor.id,
          price: doctor.price ?? null
        }))
      : getHardcodedDoctors()
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
        const selectedDoctorData = serviceData.doctors.find((d: any) => d.name === selectedDoctor) || serviceData.doctors[0];
        // Get the selected doctor from databaseDoctors array to get specialty
        const selectedDoctorFromDb = isDatabaseService 
          ? databaseDoctors.find(d => d.name === selectedDoctor) || databaseDoctors[0]
          : null;
        
        // Use doctor's specialty (from category) instead of service name
        // For database services, category contains the doctor's specialty
        // For hardcoded services, we'll use the service name as specialty (backward compatibility)
        const specialty = isDatabaseService 
          ? (selectedDoctorFromDb?.specialty || serviceData.category || serviceData.name)
          : serviceData.name;
        
        const finalDoctorId = isDatabaseService 
          ? (selectedDoctorData?.doctorId || selectedDoctorFromDb?.id || databaseDoctors[0]?.id) 
          : undefined;
        
        console.log('📝 Booking appointment with:', {
          doctorName: selectedDoctorData?.name || serviceData.doctors[0]?.name || 'Available Doctor',
          selectedDoctor: selectedDoctor,
          selectedDoctorData: selectedDoctorData,
          selectedDoctorFromDb: selectedDoctorFromDb,
          databaseDoctors: databaseDoctors.map(d => ({ id: d.id, name: d.name })),
          doctorId: finalDoctorId,
          isDatabaseService: isDatabaseService
        });
        
        const bookingId = await addAppointment({
          doctorName: selectedDoctorData?.name || serviceData.doctors[0]?.name || 'Available Doctor',
          specialty: specialty,
          clinic: serviceData.clinic,
          date: format(selectedDate, 'yyyy-MM-dd'),
          time: timeSlot,
          status: 'pending',
          doctorId: finalDoctorId
        });
        
        setPendingBookingId(bookingId);
        setIsBookingConfirmationOpen(true);
      } catch (error) {
        console.error('Error booking appointment:', error);
      }
    }
  };

  const handleConfirmBooking = async () => {
    // Don't confirm the appointment - it should remain as 'pending'
    // Only clinic admin can approve it
    // Just close the modal
    setPendingBookingId('');
    setIsBookingConfirmationOpen(false);
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
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{t(serviceData.name)}</h1>
            
            <div className="inline-block bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium mb-4">
              {t(serviceData.specialty)}
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
          <h2 className="text-lg font-medium text-gray-900 mb-4">{t('Please choose a date')}</h2>
          
          {/* Date Navigator */}
          <div className="flex items-center justify-between mb-6 bg-gray-100 rounded-lg px-3 py-2">
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
              {isRtl ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
            
            {/* Current Date Display */}
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <span className="text-lg font-bold text-gray-900">
                {formatDisplayDate(selectedDisplayDate)}
              </span>
              {isToday(selectedDisplayDate) && (
                <span className="text-sm text-gray-500">{t('Today')}</span>
              )}
            </button>
            
            {/* Right Arrow - Next Day */}
            <button
              onClick={() => setSelectedDisplayDate(addDays(selectedDisplayDate, 1))}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            >
              {isRtl ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
          </div>

          {/* Calendar Modal */}
          {showCalendar && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-sm mx-auto m-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{t('Select Date')}</h3>
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
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-gray-900 text-lg">{doctor.name}</h3>
                      {formatDoctorPrice(doctor.price) ? (
                        <span className="shrink-0 inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-semibold">
                          {t('Price')} {formatDoctorPrice(doctor.price)}
                        </span>
                      ) : null}
                    </div>
                    
                    {/* Time Slot Badge */}
                    <div className="mt-2">
                      <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                        {localizeTimeRange(doctor.timeSlots[0])}
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

      {/* Bottom Navigation - Mobile Only */}
      <BottomNavigation viewMode="services" onViewModeChange={() => {}} />
    </div>
  );
};

export default ServiceDetails;