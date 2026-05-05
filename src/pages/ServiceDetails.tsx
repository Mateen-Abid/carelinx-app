import React, { useState, useEffect, useCallback } from 'react';
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
import { toast } from 'sonner';

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

type DatabaseDoctor = {
  id: string;
  name: string;
  specialty: string;
  email: string | null;
  phone: string | null;
  availability: string | null;
  services?: string | null;
  price?: string | number | null;
  matchedTreatments?: string[];
};

type ClinicTreatmentRecord = {
  id: string;
  name: string;
  price?: string | null;
  specialty?: string | null;
  service?: string | null;
  availability?: string | null;
  status?: 'active' | 'inactive';
};

type BookableTreatmentRecord = ClinicTreatmentRecord & {
  clinicId: string;
  clinicName: string;
  clinicAddress?: string;
  clinicLogo?: string;
};

type ApprovedClinicServiceRecord = {
  id: string;
  clinicId: string;
  clinicName: string;
  serviceName: string;
  specialtyName: string;
};

type DisplayDoctor = {
  name: string;
  specialization: string;
  timeSlots: string[];
  doctorId?: string;
  price?: string | number | null;
  treatments?: string[];
};

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

  const normalizeTimeValue = (value: string | null | undefined) => {
    if (!value) return '';

    const trimmed = value.trim();
    if (!trimmed) return '';

    const twelveHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (twelveHourMatch) {
      const hourRaw = Number(twelveHourMatch[1]);
      const minute = Number(twelveHourMatch[2]);
      const period = twelveHourMatch[3].toUpperCase();

      if (Number.isNaN(hourRaw) || Number.isNaN(minute)) return '';

      let hour24 = hourRaw % 12;
      if (period === 'PM') {
        hour24 += 12;
      }

      return `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    }

    const twentyFourHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (twentyFourHourMatch) {
      const hour = Number(twentyFourHourMatch[1]);
      const minute = Number(twentyFourHourMatch[2]);

      if (Number.isNaN(hour) || Number.isNaN(minute)) return '';

      return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    }

    return trimmed.replace(/\s+/g, '').toUpperCase();
  };

  const normalizeNameValue = (value: string | null | undefined) =>
    value ? value.trim().toLowerCase() : '';

  const location = useLocation();
  const { user } = useAuth();
  const { addAppointment, cancelAppointment } = useBooking();
  const [isBookingConfirmationOpen, setIsBookingConfirmationOpen] = useState(false);
  const [isTimeSlotModalOpen, setIsTimeSlotModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [selectedTreatment, setSelectedTreatment] = useState<ClinicTreatmentRecord | null>(null);
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
  const [databaseDoctors, setDatabaseDoctors] = useState<DatabaseDoctor[]>([]);
  const [availableTreatments, setAvailableTreatments] = useState<ClinicTreatmentRecord[]>([]);
  const [occupiedDoctorSlots, setOccupiedDoctorSlots] = useState<Record<string, string[]>>({});
  const [occupiedTreatmentSlots, setOccupiedTreatmentSlots] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const rescheduleOriginalBookingId =
    typeof location.state?.rescheduleOriginalBookingId === 'string'
      ? location.state.rescheduleOriginalBookingId
      : null;

  const isDoctorBackedService = serviceId?.startsWith('doctor-');
  const isClinicRequestedService = serviceId?.startsWith('clinic-service-');
  const isTreatmentBackedService = serviceId?.startsWith('treatment-');
  // Check if serviceId is a database-backed service
  const isDatabaseService = isDoctorBackedService || isClinicRequestedService || isTreatmentBackedService;
  // Parse serviceId format: doctor-{doctorId}-{service-name}
  // UUID format is: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars including dashes)
  // So we extract first 36 chars after "doctor-" as doctorId, rest is service name
  let doctorId: string | null = null;
  let serviceNameFromId: string | null = null;
  const approvedClinicServiceId = isClinicRequestedService && serviceId
    ? serviceId.replace('clinic-service-', '')
    : null;
  const treatmentRecordId = isTreatmentBackedService && serviceId
    ? serviceId.replace('treatment-', '')
    : null;
  
  if (isDoctorBackedService && serviceId) {
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

  const normalizeMatchValue = (value: string) =>
    value.trim().toLowerCase().replace(/\s+/g, ' ');

  const splitStoredValues = (value?: string | null) =>
    (value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  const valuesOverlap = (leftValues: string[], rightValues: string[]) => {
    if (leftValues.length === 0 || rightValues.length === 0) return false;

    const normalizedLeft = leftValues.map(normalizeMatchValue);
    const normalizedRight = rightValues.map(normalizeMatchValue);

    return normalizedLeft.some((left) =>
      normalizedRight.some(
        (right) =>
          left === right ||
          left.includes(right) ||
          right.includes(left)
      )
    );
  };

  const getMatchingTreatmentNames = (
    doctor: DatabaseDoctor,
    clinicTreatments: ClinicTreatmentRecord[],
    selectedServiceName: string | null
  ) => {
    const doctorSpecialties = splitStoredValues(doctor.specialty);
    const doctorServices = splitStoredValues(doctor.services);
    const serviceTargets = selectedServiceName ? [selectedServiceName] : doctorServices;

    if (doctorSpecialties.length === 0 || serviceTargets.length === 0) {
      return [];
    }

    const matchedNames = clinicTreatments
      .filter((treatment) => {
        const treatmentSpecialties = splitStoredValues(treatment.specialty);
        const treatmentServices = splitStoredValues(treatment.service);

        return (
          valuesOverlap(treatmentSpecialties, doctorSpecialties) &&
          valuesOverlap(treatmentServices, serviceTargets)
        );
      })
      .map((treatment) => treatment.name.trim())
      .filter(Boolean);

    return Array.from(new Set(matchedNames));
  };

  const normalizeApprovedClinicService = (service: any): ApprovedClinicServiceRecord | null => {
    if (!service) return null;

    const clinicInfo = Array.isArray(service.clinics) ? service.clinics[0] : service.clinics;
    const specialtyInfo = Array.isArray(service.specialties) ? service.specialties[0] : service.specialties;

    const normalized = {
      id: String(service.id || '').trim(),
      clinicId: String(service.clinic_id || '').trim(),
      clinicName: String(clinicInfo?.name || '').trim(),
      serviceName: String(service.service_name || '').trim(),
      specialtyName: String(specialtyInfo?.name || '').trim(),
    };

    if (!normalized.id || !normalized.clinicId || !normalized.clinicName || !normalized.serviceName || !normalized.specialtyName) {
      return null;
    }

    return normalized;
  };

  const normalizeBookableTreatment = (treatment: any): BookableTreatmentRecord | null => {
    if (!treatment) return null;

    const clinicInfo = Array.isArray(treatment.clinics) ? treatment.clinics[0] : treatment.clinics;
    const normalized = {
      id: String(treatment.id || '').trim(),
      clinicId: String(treatment.clinic_id || '').trim(),
      clinicName: String(clinicInfo?.name || '').trim(),
      clinicAddress: String(clinicInfo?.address || '').trim(),
      clinicLogo: String(clinicInfo?.logo_url || '').trim(),
      name: String(treatment.name || '').trim(),
      price: treatment.price ? String(treatment.price) : null,
      specialty: String(treatment.specialty || '').trim(),
      service: String(treatment.service || '').trim(),
      availability: typeof treatment.availability === 'string' ? treatment.availability.trim() : null,
      status: treatment.status,
    };

    if (!normalized.id || !normalized.clinicId || !normalized.clinicName || !normalized.name || !normalized.specialty) {
      return null;
    }

    return normalized;
  };

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
        
        const selectedServiceNameFromState =
          typeof location.state?.selectedServiceName === 'string' && location.state.selectedServiceName.trim()
            ? location.state.selectedServiceName.trim()
            : null;
        let serviceName = isClinicRequestedService
          ? selectedServiceNameFromState
          : serviceNameFromId
            ? serviceNameFromId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
            : null;
        let selectedSpecialtyFromState =
          typeof location.state?.selectedSpecialty === 'string' && location.state.selectedSpecialty.trim()
            ? location.state.selectedSpecialty.trim()
            : null;
        let selectedTreatmentRecord: BookableTreatmentRecord | null = null;

        console.log('🔍 Fetching database service:', {
          serviceId,
          serviceName,
          doctorId,
          approvedClinicServiceId,
          selectedSpecialtyFromState,
        });

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

        if (isClinicRequestedService && approvedClinicServiceId) {
          try {
            const { services } = await api.services.getApprovedClinicServices({ id: approvedClinicServiceId });
            const approvedClinicService = normalizeApprovedClinicService(services?.[0]);

            if (approvedClinicService) {
              clinicId = clinicId || approvedClinicService.clinicId;
              serviceName = serviceName || approvedClinicService.serviceName;
              selectedSpecialtyFromState = selectedSpecialtyFromState || approvedClinicService.specialtyName;
            }
          } catch (error) {
            console.error('Error fetching approved clinic service:', error);
          }
        }

        if (isTreatmentBackedService && treatmentRecordId) {
          try {
            const { treatments } = await api.services.getBookableTreatments({ id: treatmentRecordId });
            selectedTreatmentRecord = normalizeBookableTreatment(treatments?.[0]);

            if (selectedTreatmentRecord) {
              clinicId = clinicId || selectedTreatmentRecord.clinicId;
              serviceName = selectedTreatmentRecord.name;
              selectedSpecialtyFromState = selectedSpecialtyFromState || selectedTreatmentRecord.specialty || null;
            }
          } catch (error) {
            console.error('Error fetching treatment:', error);
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
        const { doctors: allDoctorsRaw } = await api.doctors.getDoctors(clinicId);
        const allDoctors = (allDoctorsRaw || []) as DatabaseDoctor[];

        if (!allDoctors) {
          console.error('Error fetching doctors');
          setLoading(false);
          return;
        }

        // First, get the specialty from the original doctor (to filter by specialty)
        let requiredSpecialty: string | null = selectedSpecialtyFromState;
        if (!requiredSpecialty && doctorId) {
          const originalDoctor = allDoctors.find((d: any) => d.id === doctorId);
          requiredSpecialty = originalDoctor?.specialty || null;
        }

        // Filter doctors that provide this specific service AND match the specialty
        // Normalize service name for matching (case-insensitive, flexible)
        let doctorsProvidingService: DatabaseDoctor[] = [];
        
        if (isTreatmentBackedService && selectedTreatmentRecord) {
          const treatmentSpecialties = splitStoredValues(selectedTreatmentRecord.specialty);
          const treatmentServices = splitStoredValues(selectedTreatmentRecord.service);

          doctorsProvidingService = allDoctors.filter((doctor) => {
            const doctorSpecialties = splitStoredValues(doctor.specialty);
            const doctorServices = splitStoredValues(doctor.services);

            const specialtyMatches =
              treatmentSpecialties.length === 0 || valuesOverlap(treatmentSpecialties, doctorSpecialties);
            const serviceMatches =
              treatmentServices.length === 0 || valuesOverlap(treatmentServices, doctorServices);

            return specialtyMatches && serviceMatches;
          });
        } else if (serviceName) {
          // Filter doctors whose services column contains this service name AND specialty matches
          const serviceNameNormalized = normalizeMatchValue(serviceName);
          
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
            const doctorServices = splitStoredValues(doctor.services).map(normalizeMatchValue);
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

        let clinicTreatments: ClinicTreatmentRecord[] = [];
        try {
          const response = await api.services.getClinicTreatments(clinicId);
          clinicTreatments = (response?.treatments || []) as ClinicTreatmentRecord[];
        } catch (error) {
          console.error('Error fetching clinic treatments:', error);
        }

        const doctorsWithTreatments = doctorsProvidingService.map((doctor) => ({
          ...doctor,
          matchedTreatments: isTreatmentBackedService && selectedTreatmentRecord
            ? [selectedTreatmentRecord.name]
            : getMatchingTreatmentNames(doctor, clinicTreatments, serviceName),
        }));

        const relevantTreatments = isTreatmentBackedService
          ? (selectedTreatmentRecord ? [selectedTreatmentRecord] : [])
          : clinicTreatments.filter((treatment) => {
              if (treatment.status === 'inactive') return false;

              const treatmentSpecialties = splitStoredValues(treatment.specialty);
              const treatmentServices = splitStoredValues(treatment.service);
              const specialtyMatches =
                !requiredSpecialty || valuesOverlap(treatmentSpecialties, [requiredSpecialty]);
              const serviceMatches =
                !serviceName || valuesOverlap(treatmentServices, [serviceName]);

              return specialtyMatches && serviceMatches;
            });

        console.log('✅ Doctors providing service:', doctorsProvidingService.length, serviceName || 'all');
        setDatabaseDoctors(doctorsWithTreatments);
        setAvailableTreatments(relevantTreatments);
        setSelectedTreatment(isTreatmentBackedService && selectedTreatmentRecord ? selectedTreatmentRecord : null);
        if (isTreatmentBackedService) {
          setSelectedDoctor('');
        }

        // Get specialty from first doctor (all should have same specialty for same service)
        const firstDoctor = doctorsWithTreatments[0];
        const specialty = requiredSpecialty || firstDoctor?.specialty || 'General';

        // Create service object
        setDatabaseService({
          id: serviceId,
          name: selectedTreatmentRecord?.name || serviceName || 'General Consultation',
          category: selectedTreatmentRecord?.specialty || specialty,
          doctorName: firstDoctor?.name || 'Available Doctor',
          doctorId: firstDoctor?.id || '',
          bookingType: isTreatmentBackedService ? 'treatment' : 'service',
          treatmentId: selectedTreatmentRecord?.id || null,
          price: selectedTreatmentRecord?.price || null,
        });

      } catch (error) {
        console.error('Error in fetchDatabaseService:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDatabaseService();
  }, [approvedClinicServiceId, doctorId, isClinicRequestedService, isDatabaseService, isTreatmentBackedService, location.state, serviceId, serviceNameFromId, treatmentRecordId]);

  // Get service and clinic data - prioritize database, fallback to hardcoded
  const service = isDatabaseService ? databaseService : getServiceById(serviceId || '');
  const clinic = isDatabaseService ? databaseClinic : getClinicByServiceId(serviceId || '');
  
  // For hardcoded services, get all doctors who provide this service from the same clinic
  const getHardcodedDoctors = () => {
    if (isDatabaseService || !service || !clinic) return [];
    
    const doctors: DisplayDoctor[] = [];
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

  const fetchOccupiedSlots = useCallback(async (targetDate: Date) => {
    try {
      const date = format(targetDate, 'yyyy-MM-dd');
      const fallbackDoctors = !isDatabaseService ? getHardcodedDoctors() : [];
      const doctorIds = databaseDoctors.map((doctor) => doctor.id).filter(Boolean);
      const doctorNames = (isDatabaseService ? databaseDoctors : fallbackDoctors)
        .map((doctor) => doctor.name)
        .filter(Boolean);
      const treatmentIds = availableTreatments.map((treatment) => treatment.id).filter(Boolean);
      const treatmentNames = availableTreatments.map((treatment) => treatment.name).filter(Boolean);

      if (
        doctorIds.length === 0 &&
        doctorNames.length === 0 &&
        treatmentIds.length === 0 &&
        treatmentNames.length === 0
      ) {
        setOccupiedDoctorSlots({});
        setOccupiedTreatmentSlots({});
        return;
      }

      const response = await api.bookings.getOccupiedSlots({
        date,
        doctorIds,
        doctorNames,
        treatmentIds,
        treatmentNames,
        clinicId: isDatabaseService ? databaseClinic?.id : undefined,
        clinic: !isDatabaseService && clinic ? clinic.name : undefined,
      });

      setOccupiedDoctorSlots(response?.occupiedDoctorSlots || {});
      setOccupiedTreatmentSlots(response?.occupiedTreatmentSlots || {});
    } catch (error) {
      console.error('Error fetching occupied slots:', error);
      setOccupiedDoctorSlots({});
      setOccupiedTreatmentSlots({});
    }
  }, [availableTreatments, clinic, databaseClinic?.id, databaseDoctors, isDatabaseService]);

  useEffect(() => {
    if (loading) return;
    fetchOccupiedSlots(selectedDisplayDate);
  }, [selectedDisplayDate, loading, fetchOccupiedSlots]);
  
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

  const serviceData: {
    name: string;
    specialty: string;
    description: string;
    clinic: string;
    clinicLogo: string;
    address: string;
    schedule: Record<string, string>;
    doctors: DisplayDoctor[];
  } = {
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
    doctors: isDatabaseService
      ? databaseDoctors.map(doctor => ({
          name: doctor.name,
          specialization: `${doctor.specialty || 'General'} - Specialist`,
          timeSlots: doctor.availability 
            ? [doctor.availability] 
            : ['10:00 AM – 2:00 PM', '2:00 PM – 6:00 PM'],
          doctorId: doctor.id,
          price: doctor.price ?? null,
          treatments: doctor.matchedTreatments || [],
        }))
      : getHardcodedDoctors()
  };

  const handleBookAppointment = () => {
    setIsBookingConfirmationOpen(true);
  };

  const handleTreatmentSelect = async (treatment: ClinicTreatmentRecord) => {
    setSelectedTreatment(treatment);
    setSelectedDoctor('');
    setSelectedDate(selectedDisplayDate);
    await fetchOccupiedSlots(selectedDisplayDate);
    setIsTimeSlotModalOpen(true);
  };

  const handleDoctorSelect = async (doctorName: string) => {
    setSelectedTreatment(null);
    setSelectedDoctor(doctorName);
    setSelectedDate(selectedDisplayDate);
    await fetchOccupiedSlots(selectedDisplayDate);
    setIsTimeSlotModalOpen(true);
  };

  const handleDateSelect = async (date: Date) => {
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
    await fetchOccupiedSlots(date);
    setIsTimeSlotModalOpen(true);
  };

  const handleTimeSlotBook = async (timeSlot: string) => {
    // Double-check authentication before booking
    if (!user) {
      setIsAuthPromptOpen(true);
      return;
    }
    
    setSelectedTimeSlot(timeSlot);
    
    // Create pending booking
    if (selectedDate && serviceData) {
      try {
        const isTreatmentBooking =
          !!selectedTreatment ||
          (!selectedDoctor &&
            (isTreatmentBackedService ||
              location.state?.bookingType === 'treatment' ||
              databaseService?.bookingType === 'treatment'));
        const selectedDoctorData = serviceData.doctors.find((d: any) => d.name === selectedDoctor) || serviceData.doctors[0];
        // Get the selected doctor from databaseDoctors array to get specialty
        const selectedDoctorFromDb = isDatabaseService 
          ? databaseDoctors.find(d => d.name === selectedDoctor) || databaseDoctors[0]
          : null;
        
        // Use doctor's specialty (from category) instead of service name
        // For database services, category contains the doctor's specialty
        // For hardcoded services, we'll use the service name as specialty (backward compatibility)
        const specialty = isDatabaseService 
          ? (selectedTreatment?.specialty || selectedDoctorFromDb?.specialty || serviceData.specialty || serviceData.name)
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
          serviceName: isTreatmentBooking
            ? serviceData.name
            : serviceData.name,
          clinic: serviceData.clinic,
          clinicId: isDatabaseService ? databaseClinic?.id : undefined,
          date: format(selectedDate, 'yyyy-MM-dd'),
          time: timeSlot,
          status: 'pending',
          doctorId: finalDoctorId,
          bookingType: isTreatmentBooking ? 'treatment' : 'doctor',
          treatmentId: isTreatmentBooking ? (selectedTreatment?.id || databaseService?.treatmentId || treatmentRecordId || undefined) : undefined,
          treatmentName: isTreatmentBooking ? (selectedTreatment?.name || serviceData.name) : undefined,
        });

        if (rescheduleOriginalBookingId) {
          await cancelAppointment(rescheduleOriginalBookingId);
        }
        
        setPendingBookingId(bookingId);
        setIsTimeSlotModalOpen(false);
        setIsBookingConfirmationOpen(true);
      } catch (error: any) {
        console.error('Error booking appointment:', error);
        toast.error(error?.message || t('Failed to send booking request. Please try again.'));
        throw error;
      }
    }
  };

  const handleConfirmBooking = async () => {
    // Don't confirm the appointment - it should remain as 'pending'
    // Only clinic admin can approve it
    // Just close the modal
    setPendingBookingId('');
    setIsBookingConfirmationOpen(false);
    setSelectedTreatment(null);
  };

  const getOccupiedSlotsForDoctor = (doctor: DisplayDoctor): string[] => {
    if (doctor.doctorId && occupiedDoctorSlots[doctor.doctorId]) {
      return occupiedDoctorSlots[doctor.doctorId];
    }

    return occupiedDoctorSlots[normalizeNameValue(doctor.name)] || [];
  };

  const getOccupiedSlotsForTreatment = (treatment: ClinicTreatmentRecord): string[] => {
    if (occupiedTreatmentSlots[treatment.id]) {
      return occupiedTreatmentSlots[treatment.id];
    }

    return occupiedTreatmentSlots[normalizeNameValue(treatment.name)] || [];
  };

  const generateSlotsFromRange = (range: string): string[] => {
    // Supports both "-" and "–" separators (e.g. "9:00 AM - 5:00 PM")
    const normalized = range.replace('–', '-');
    const parts = normalized.split('-').map((part) => part.trim());
    if (parts.length !== 2) return [];

    const [startTime, endTime] = parts;
    const slots: string[] = [];
    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      return [];
    }

    const current = new Date(start);
    while (current < end) {
      slots.push(format(current, 'h:mma'));
      current.setMinutes(current.getMinutes() + 30);
    }

    return slots;
  };

  const getDoctorSlotsForDate = (availability: string, date: Date): string[] => {
    const dayFull = format(date, 'EEEE').toLowerCase(); // monday
    const dayShort = format(date, 'EEE').toLowerCase(); // mon
    const entries = availability
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean);

    // Multi-day format: "Monday: 10:00 AM - 2:00 PM | Tuesday: 11:00 AM - 1:00 PM"
    const daySpecificSlots = entries
      .map((entry) => {
        const match = entry.match(/^([A-Za-z]+):\s*(.+)$/);
        if (!match) return null;
        const dayLabel = match[1].toLowerCase();
        const rangePart = match[2].trim();
        const matchesDay = dayLabel === dayFull || dayLabel.slice(0, 3) === dayShort;
        if (!matchesDay) return null;
        return generateSlotsFromRange(rangePart);
      })
      .filter((slots): slots is string[] => Array.isArray(slots))
      .flat();

    if (daySpecificSlots.length > 0) return daySpecificSlots;

    // Legacy single-range format (no day prefix), apply as fallback for any selected day
    if (entries.length === 1 && !entries[0].includes(':')) {
      return generateSlotsFromRange(entries[0]);
    }

    return [];
  };

  const getDoctorAvailabilityLabelForDate = (
    timeSlots: string[] | undefined,
    date: Date
  ) => {
    if (!timeSlots || timeSlots.length === 0) return t('Not available');

    const availability = timeSlots[0];
    const dayFull = format(date, 'EEEE').toLowerCase();
    const dayShort = format(date, 'EEE').toLowerCase();
    const entries = availability
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean);

    // Day-specific availability format:
    // "Monday: 10:00 AM - 1:00 PM | Tuesday: 11:00 AM - 2:00 PM"
    const dayEntry = entries.find((entry) => {
      const match = entry.match(/^([A-Za-z]+):\s*(.+)$/);
      if (!match) return false;
      const dayLabel = match[1].toLowerCase();
      return dayLabel === dayFull || dayLabel.slice(0, 3) === dayShort;
    });

    if (dayEntry) {
      const match = dayEntry.match(/^([A-Za-z]+):\s*(.+)$/);
      if (!match) return dayEntry;
      const [, , rangeRaw] = match;
      return localizeTimeRange(rangeRaw.trim());
    }

    // Legacy single range format fallback
    if (entries.length === 1 && !entries[0].includes(':')) {
      return localizeTimeRange(entries[0]);
    }

    return t('Not available on selected date');
  };

  const getBookableTimeSlotsForDate = (
    availability: string | undefined | null,
    date: Date,
    occupiedSlots: string[] = []
  ) => {
    if (!availability) return [];

    const availableSlots = getDoctorSlotsForDate(availability, date);
    if (occupiedSlots.length === 0) return availableSlots;

    const occupiedSlotSet = new Set(occupiedSlots.map((slot) => normalizeTimeValue(slot)));
    return availableSlots.filter((slot) => !occupiedSlotSet.has(normalizeTimeValue(slot)));
  };

  const hasAvailabilityOnSelectedDate = (availability?: string | null, occupiedSlots: string[] = []) => {
    if (!availability) return false;
    return getBookableTimeSlotsForDate(availability, selectedDisplayDate, occupiedSlots).length > 0;
  };

  // Generate time slots using selected doctor availability first, then service schedule fallback
  const getTimeSlots = (date: Date, doctorRange?: string) => {
    if (doctorRange) {
      // IMPORTANT: when doctor availability exists, ONLY use doctor availability.
      // Do not fallback to generic clinic schedule for non-matching days.
      return getDoctorSlotsForDate(doctorRange, date);
    }

    const dayName = format(date, 'EEE');
    const schedule = serviceData.schedule[dayName];
    
    if (!schedule || schedule === 'Closed') return [];
    
    return generateSlotsFromRange(schedule);
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

      {/* Treatments Section */}
      {availableTreatments.length > 0 && (
        <section className="py-2 px-4 sm:px-8 bg-white">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t('Available Treatments')}
            </h2>
            <div className="space-y-4">
              {availableTreatments.map((treatment) => {
                const occupiedTreatmentTimeSlots = getOccupiedSlotsForTreatment(treatment);
                const isTreatmentAvailable = hasAvailabilityOnSelectedDate(
                  treatment.availability,
                  occupiedTreatmentTimeSlots
                );

                return (
                <div
                  key={treatment.id}
                  className={`bg-white border border-gray-200 rounded-lg p-4 transition-shadow ${
                    isTreatmentAvailable ? 'cursor-pointer hover:shadow-md' : 'cursor-not-allowed opacity-70'
                  }`}
                  onClick={isTreatmentAvailable ? () => handleTreatmentSelect(treatment) : undefined}
                  aria-disabled={!isTreatmentAvailable}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="min-w-0 break-words font-semibold text-gray-900 text-lg">
                        {treatment.name}
                      </h3>

                      <div className="mt-2">
                        <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                          {getDoctorAvailabilityLabelForDate(
                            treatment.availability ? [treatment.availability] : undefined,
                            selectedDisplayDate
                          )}
                        </span>
                      </div>

                      {formatDoctorPrice(treatment.price) ? (
                        <div
                          className={`mt-3 flex w-full flex-wrap items-center gap-x-3 gap-y-2 ${
                            isRtl ? 'justify-start' : 'justify-end'
                          } text-right`}
                        >
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs font-medium text-gray-500">
                              {`${t('Price')}:`}
                            </span>
                            <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-semibold">
                              {formatDoctorPrice(treatment.price)}
                            </span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )})}
            </div>
          </div>
        </section>
      )}

      {/* Doctors Section */}
      <section className="py-6 px-4 sm:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('Available Doctors')}</h2>
          {serviceData.doctors.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
              <h3 className="text-lg font-semibold text-gray-900">{t('No doctors available for this service')}</h3>
              <p className="mt-2 text-sm text-gray-600">
                {t('This service is approved for the clinic, but no doctor has been assigned yet.')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {serviceData.doctors.map((doctor, index) => {
                const occupiedDoctorTimeSlots = getOccupiedSlotsForDoctor(doctor);
                const isDoctorAvailable = hasAvailabilityOnSelectedDate(
                  doctor.timeSlots?.[0],
                  occupiedDoctorTimeSlots
                );

                return (
                <div
                  key={index}
                  className={`bg-white border border-gray-200 rounded-lg p-4 transition-shadow ${
                    isDoctorAvailable ? 'cursor-pointer hover:shadow-md' : 'cursor-not-allowed opacity-70'
                  }`}
                  onClick={isDoctorAvailable ? () => handleDoctorSelect(doctor.name) : undefined}
                  aria-disabled={!isDoctorAvailable}
                >
                  <div className="flex items-center gap-4">
                    {/* Doctor Avatar */}
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    
                    {/* Doctor Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="min-w-0 break-words font-semibold text-gray-900 text-lg">
                        {doctor.name}
                      </h3>
                      
                      {/* Time Slot Badge */}
                      <div className="mt-2">
                        <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                          {getDoctorAvailabilityLabelForDate(doctor.timeSlots, selectedDisplayDate)}
                        </span>
                      </div>

                      {formatDoctorPrice(doctor.price) ? (
                        <div
                          className={`mt-3 flex w-full flex-wrap items-center gap-x-3 gap-y-2 ${
                            isRtl ? 'justify-start' : 'justify-end'
                          } text-right`}
                        >
                          {formatDoctorPrice(doctor.price) ? (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs font-medium text-gray-500">
                                {`${t('Price')}:`}
                              </span>
                              <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-semibold">
                                {formatDoctorPrice(doctor.price)}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      </section>

      <BookingConfirmationModal
        isOpen={isBookingConfirmationOpen}
        onClose={() => setIsBookingConfirmationOpen(false)}
        onConfirm={handleConfirmBooking}
        bookingDetails={{
          date: selectedDate ? format(selectedDate, 'MMMM d, yyyy') : '',
          time: selectedTimeSlot,
          service: selectedTreatment?.name || serviceData.name,
          clinic: serviceData.clinic
        }}
      />

      <TimeSlotModal
        isOpen={isTimeSlotModalOpen}
        onClose={() => setIsTimeSlotModalOpen(false)}
        selectedDate={selectedDate}
        timeSlots={selectedDate ? getTimeSlots(
          selectedDate,
          selectedTreatment?.availability ||
            serviceData.doctors.find((doctor) => doctor.name === selectedDoctor)?.timeSlots?.[0]
        ) : []}
        disabledTimeSlots={
          selectedTreatment
            ? getOccupiedSlotsForTreatment(selectedTreatment)
            : (() => {
                const activeDoctor = serviceData.doctors.find((doctor) => doctor.name === selectedDoctor);
                return activeDoctor ? getOccupiedSlotsForDoctor(activeDoctor) : [];
              })()
        }
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