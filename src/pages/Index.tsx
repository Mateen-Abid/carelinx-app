import React, { useState, useMemo, useEffect, useRef } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isAfter, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import ServicesFilter from '@/components/ServicesFilter';
import ServiceCard from '@/components/ServiceCard';
import ClinicCard from '@/components/ClinicCard';
import BottomNavigation from '@/components/BottomNavigation';
import SearchInput from '@/components/SearchInput';
import { BookingModal } from '@/components/BookingModal';
import { clinicsData, getAllServices, getAllCategories } from '@/data/clinicsData';
import { api } from '@/services/api';
import { useTranslation } from 'react-i18next';

interface DatabaseClinic {
  id: string;
  name: string;
  address: string;
  logo_url: string | null;
  specialties: string[] | null;
  description: string | null;
  status: string;
}

interface ApprovedClinicService {
  id: string;
  clinicId: string;
  clinicName: string;
  serviceName: string;
  specialtyId: string | null;
  specialtyName: string;
}

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [viewMode, setViewMode] = useState<'services' | 'clinics'>('services');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>(''); // Track selected service name
  const [selectedServiceId, setSelectedServiceId] = useState<string>(''); // Track selected service ID for navigation
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<string>('');
  const selectedClinicRef = useRef<string>(''); // Ref to store clinic name synchronously
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showDistanceFilter, setShowDistanceFilter] = useState(false);
  const [distanceFilter, setDistanceFilter] = useState<'nearest' | 'farthest' | null>(null);
  const [clinicSearchQuery, setClinicSearchQuery] = useState<string>('');
  const [databaseClinics, setDatabaseClinics] = useState<DatabaseClinic[]>([]);
  const [loadingClinics, setLoadingClinics] = useState(true);
  const [clinicDoctors, setClinicDoctors] = useState<Record<string, Array<{id: string, name: string, specialty: string, email: string | null, phone: string | null, availability: string | null, services?: string | null, price?: string | number | null}>>>({});
  const [superAdminSpecialties, setSuperAdminSpecialties] = useState<Array<{id: string, name: string}>>([]);
  const [superAdminServices, setSuperAdminServices] = useState<Array<{id: string, name: string, specialty_id: string, specialty_name: string}>>([]);
  const [approvedClinicServices, setApprovedClinicServices] = useState<ApprovedClinicService[]>([]);
  const filterRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [skipEmailConfirmedRedirect] = useState(() => {
    const skip = sessionStorage.getItem('skip_email_confirmed_redirect') === 'true';
    if (skip) {
      sessionStorage.removeItem('skip_email_confirmed_redirect');
    }
    return skip;
  });
  const [emailConfirmMeta] = useState(() => {
    const flag = sessionStorage.getItem('email_just_confirmed') === 'true';
    const timeValue = sessionStorage.getItem('email_confirmed_time');
    if (flag) {
      sessionStorage.removeItem('email_just_confirmed');
      sessionStorage.removeItem('email_confirmed_time');
    }
    return { flag, time: timeValue ? Number(timeValue) : null };
  });
  const shouldHandleEmailConfirm = emailConfirmMeta.flag;
  const confirmAgeMs = emailConfirmMeta.time ? Date.now() - emailConfirmMeta.time : null;
  const isRecentEmailConfirm = shouldHandleEmailConfirm && (confirmAgeMs === null || confirmAgeMs < 10 * 60 * 1000);
  const { user, userRole } = useAuth(); // Get user and role from AuthContext to check if email was just confirmed
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  // Check for email confirmation tokens on mount and redirect immediately
  // This runs BEFORE any rendering happens
  useEffect(() => {
    // Check if user just confirmed email (from AuthContext)
    if (!skipEmailConfirmedRedirect && shouldHandleEmailConfirm && isRecentEmailConfirm && user && user.email_confirmed_at && window.location.pathname === '/') {
      const confirmedTime = new Date(user.email_confirmed_at).getTime();
      const now = Date.now();
      const timeSinceConfirmation = now - confirmedTime;
      const fiveMinutes = 5 * 60 * 1000; // 5 minutes
      
      console.log('📧 Index page - User found with email_confirmed_at:', user.email_confirmed_at);
      console.log('📧 Index page - Time since confirmation:', timeSinceConfirmation, 'ms');
      
      // If email was confirmed within last 5 minutes, redirect to auth page
      if (timeSinceConfirmation < fiveMinutes) {
        console.log('📧 Index page - User just confirmed email (within last 5 minutes), redirecting to /auth');
        setIsRedirecting(true);
        window.history.replaceState(null, '', '/auth?mode=login&message=email_confirmed');
        window.location.href = '/auth?mode=login&message=email_confirmed';
        return;
      }
    }
    
    
    // Check hash immediately
    const checkAndRedirect = () => {
      const hash = window.location.hash;
      if (!hash) return false;
      
      try {
        const hashParams = new URLSearchParams(hash.substring(1));
        const hashType = hashParams.get('type');
        const hashAccessToken = hashParams.get('access_token');
        const hashRefreshToken = hashParams.get('refresh_token');
        const hashError = hashParams.get('error');
        const hashErrorCode = hashParams.get('error_code');
        
        // Check for email confirmation errors (expired/invalid link)
        if (hashError === 'access_denied' && (hashErrorCode === 'otp_expired' || hashErrorCode === 'email_not_confirmed')) {
          console.log('📧 Index page - Email confirmation link expired/invalid, redirecting to auth page');
          setIsRedirecting(true);
          // Redirect to auth page with error message
          window.history.replaceState(null, '', '/auth?mode=login&error=email_link_expired&message=The+email+confirmation+link+has+expired.+Please+request+a+new+confirmation+email.');
          window.location.href = '/auth?mode=login&error=email_link_expired&message=The+email+confirmation+link+has+expired.+Please+request+a+new+confirmation+email.';
          return true;
        }
        
        // Check for email confirmation (signup or email type)
        const isEmailConfirmation = (hashType === 'signup' || hashType === 'email') && hashAccessToken && hashRefreshToken;
        
        if (isEmailConfirmation) {
          console.log('📧 Index page - Email confirmation detected, redirecting to /auth');
          setIsRedirecting(true);
          // Clear hash and redirect immediately to auth page
          window.history.replaceState(null, '', '/auth?mode=login&message=email_confirmed');
          window.location.href = '/auth?mode=login&message=email_confirmed';
          return true;
        }
      } catch (e) {
        console.error('Error checking hash:', e);
      }
      return false;
    };
    
    // Check immediately
    if (checkAndRedirect()) {
      return; // Exit early if redirecting
    }
  }, [navigate, user]); // Add user to dependencies
  
  // Also check on every render (defensive) - check user from AuthContext first
  if (!skipEmailConfirmedRedirect && shouldHandleEmailConfirm && isRecentEmailConfirm && user && user.email_confirmed_at && window.location.pathname === '/' && !isRedirecting) {
    const confirmedTime = new Date(user.email_confirmed_at).getTime();
    const now = Date.now();
    const timeSinceConfirmation = now - confirmedTime;
    const fiveMinutes = 5 * 60 * 1000;
    
    if (timeSinceConfirmation < fiveMinutes) {
      console.log('📧 Index page - User just confirmed email (render check), redirecting to /auth');
      window.history.replaceState(null, '', '/auth?mode=login&message=email_confirmed');
      window.location.href = '/auth?mode=login&message=email_confirmed';
      return null; // Don't render
    }
  }
  
  
  // CRITICAL: Check hash on render for errors and email confirmation
  // This must run BEFORE any other render logic
  const currentHash = window.location.hash;
  if (currentHash && !isRedirecting) {
    try {
      const hashParams = new URLSearchParams(currentHash.substring(1));
      const hashType = hashParams.get('type');
      const hashAccessToken = hashParams.get('access_token');
      const hashRefreshToken = hashParams.get('refresh_token');
      const hashError = hashParams.get('error');
      const hashErrorCode = hashParams.get('error_code');
      
      // Check for email confirmation errors (expired/invalid link)
      if (hashError === 'access_denied' && (hashErrorCode === 'otp_expired' || hashErrorCode === 'email_not_confirmed')) {
        console.log('📧 Index page - Email confirmation link expired/invalid in render, redirecting to auth page');
        window.history.replaceState(null, '', '/auth?mode=login&error=email_link_expired&message=The+email+confirmation+link+has+expired.+Please+request+a+new+confirmation+email.');
        window.location.href = '/auth?mode=login&error=email_link_expired&message=The+email+confirmation+link+has+expired.+Please+request+a+new+confirmation+email.';
        return null; // Don't render
      }
      
      const isEmailConfirmation = (hashType === 'signup' || hashType === 'email') && hashAccessToken && hashRefreshToken;
      
      if (isEmailConfirmation) {
        console.log('📧 Index page - Email confirmation detected in render, redirecting to /auth');
        window.history.replaceState(null, '', '/auth?mode=login&message=email_confirmed');
        window.location.href = '/auth?mode=login&message=email_confirmed';
        return null; // Don't render
      }
    } catch (e) {
      // Ignore errors
    }
  }


  // CRITICAL: Check if user just confirmed email BEFORE rendering anything
  // This must happen in the render phase, not just useEffect
  // Check this FIRST, before any other logic
  // This is the PRIMARY check - if user has email_confirmed_at and is on root, redirect
  if (!skipEmailConfirmedRedirect && shouldHandleEmailConfirm && isRecentEmailConfirm && user && user.email_confirmed_at && window.location.pathname === '/') {
    const confirmedTime = new Date(user.email_confirmed_at).getTime();
    const now = Date.now();
    const timeSinceConfirmation = now - confirmedTime;
    
    console.log('🚨 Index page RENDER - Checking email confirmation');
    console.log('🚨 Confirmed at:', user.email_confirmed_at);
    console.log('🚨 Time since:', Math.round(timeSinceConfirmation / 1000), 'seconds');
    console.log('🚨 User role:', userRole);
    
    // If user has no role or is 'patient', they likely just confirmed
    // Redirect them immediately regardless of time
    const hasNoRole = !userRole || userRole === 'patient';
    
    // Also check if email was confirmed recently (within 1 hour)
    const confirmedRecently = timeSinceConfirmation < 60 * 60 * 1000;
    
    // Redirect if: user has no role/patient OR email confirmed within last hour
    if (hasNoRole || confirmedRecently) {
      console.log('🚨 Index page RENDER - BLOCKING RENDER: User just confirmed email');
      console.log('🚨 Reason:', hasNoRole ? 'No role/patient role' : 'Confirmed within last hour');
      console.log('🚨 Redirecting to /auth immediately');
      
      // Use window.location.replace for immediate redirect (can't go back)
      window.history.replaceState(null, '', '/auth?mode=login&message=email_confirmed');
      window.location.replace('/auth?mode=login&message=email_confirmed');
      
      // Return null to prevent ANY rendering
      return null;
    }
  }

  // Don't render if we're redirecting
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-[#00FFA2] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">{t('Redirecting...')}</p>
        </div>
      </div>
    );
  }

  // FINAL CHECK: Before rendering, check if user just confirmed email
  // This is the last line of defense - if all other checks failed, this will catch it
  if (!skipEmailConfirmedRedirect && shouldHandleEmailConfirm && isRecentEmailConfirm && user && user.email_confirmed_at && window.location.pathname === '/') {
    const confirmedTime = new Date(user.email_confirmed_at).getTime();
    const timeSinceConfirmation = Date.now() - confirmedTime;
    const fiveMinutes = 5 * 60 * 1000;
    
    if (timeSinceConfirmation < fiveMinutes) {
      console.log('🚨 Index page - FINAL CHECK: User just confirmed email, blocking render and redirecting to /auth');
      // Force redirect - this will prevent any rendering
      window.history.replaceState(null, '', '/auth?mode=login&message=email_confirmed');
      window.location.replace('/auth?mode=login&message=email_confirmed');
      // Return null to prevent any rendering
      return null;
    }
  }

  // Fetch clinics from database via backend
  useEffect(() => {
    const fetchClinics = async () => {
      try {
        setLoadingClinics(true);
        console.log('📡 Fetching clinics from backend...');
        
        const { clinics: data } = await api.clinics.getClinics();
        console.log('✅ Fetched clinics from backend:', data?.length || 0);
        setDatabaseClinics(data || []);
        
        // Fetch all doctors via backend
        if (data && data.length > 0) {
          console.log('📡 Fetching doctors from backend...');
          const { doctors: doctorsData } = await api.doctors.getDoctors();
          
          console.log('✅ Fetched doctors from backend:', doctorsData?.length || 0);
          // Group doctors by clinic_id
          const doctorsByClinic: Record<string, Array<{id: string, name: string, specialty: string, email: string | null, phone: string | null, availability: string | null, services?: string | null, price?: string | number | null}>> = {};
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (doctorsData as any[])?.forEach((doctor: any) => {
            if (!doctorsByClinic[doctor.clinic_id]) {
              doctorsByClinic[doctor.clinic_id] = [];
            }
            doctorsByClinic[doctor.clinic_id].push({
              id: doctor.id,
              name: doctor.name,
              specialty: doctor.specialty,
              email: doctor.email,
              phone: doctor.phone,
              availability: doctor.availability,
              services: doctor.services,
              price: doctor.price ?? null
            });
            
            // Debug: Log doctor services
            if (doctor.services) {
              console.log(`👨‍⚕️ Doctor ${doctor.name} (${doctor.specialty}) has services:`, doctor.services);
            } else {
              console.log(`⚠️ Doctor ${doctor.name} (${doctor.specialty}) has NO services`);
            }
          });
          setClinicDoctors(doctorsByClinic);
          console.log('📋 Doctors grouped by clinic:', Object.keys(doctorsByClinic).length, 'clinics');
        }
      } catch (error) {
        console.error('Error fetching clinics:', error);
      } finally {
        setLoadingClinics(false);
      }
    };

    const fetchSuperAdminData = async () => {
      try {
        console.log('📡 Fetching specialties and approved clinic services from backend...');
        const [
          { specialties: specialtiesData },
          { treatments: servicesData },
          { services: approvedClinicServicesData },
        ] = await Promise.all([
          api.services.getSpecialties(),
          api.services.getTreatments(),
          api.services.getApprovedClinicServices(),
        ]);

        console.log('✅ Fetched specialties:', specialtiesData?.length || 0);
        setSuperAdminSpecialties((specialtiesData || []).map((s: any) => ({ id: s.id, name: s.name })));
        console.log('✅ Fetched treatments:', servicesData?.length || 0);
        const transformedServices = (servicesData || []).map((service: any) => ({
          id: service.id,
          name: service.name,
          specialty_id: service.specialty_id,
          specialty_name: service.specialties?.name || 'Unknown'
        }));
        setSuperAdminServices(transformedServices);

        const transformedApprovedClinicServices: ApprovedClinicService[] = (approvedClinicServicesData || [])
          .map((service: any) => {
            const clinicInfo = Array.isArray(service.clinics) ? service.clinics[0] : service.clinics;
            const specialtyInfo = Array.isArray(service.specialties) ? service.specialties[0] : service.specialties;

            return {
              id: String(service.id || '').trim(),
              clinicId: String(service.clinic_id || '').trim(),
              clinicName: String(clinicInfo?.name || '').trim(),
              serviceName: String(service.service_name || '').trim(),
              specialtyId: service.specialty_id || null,
              specialtyName: String(specialtyInfo?.name || '').trim(),
            };
          })
          .filter((service) => service.id && service.clinicId && service.clinicName && service.serviceName && service.specialtyName);

        console.log('✅ Fetched approved clinic services:', transformedApprovedClinicServices.length);
        setApprovedClinicServices(transformedApprovedClinicServices);
      } catch (error) {
        console.error('Error fetching super admin data:', error);
      }
    };

    fetchClinics();
    fetchSuperAdminData();
  }, []);

  // Handle clicks outside the filter dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowDistanceFilter(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const mapSpecialtyToCategory = (specialty: string) => {
    const specialtyLower = specialty.toLowerCase();

    if (
      specialtyLower.includes('dermatology') ||
      specialtyLower.includes('skin') ||
      specialtyLower.includes('facial') ||
      specialtyLower.includes('acne') ||
      specialtyLower.includes('cosmetic dermatology')
    ) {
      return 'dermatology';
    }

    if (
      specialtyLower.includes('dental') ||
      specialtyLower.includes('dentistry') ||
      specialtyLower.includes('orthodontics') ||
      specialtyLower.includes('oral') ||
      specialtyLower.includes('tooth') ||
      specialtyLower.includes('teeth')
    ) {
      return 'dentistry';
    }

    return 'others';
  };

  // Generate service cards from database clinics and doctors, with fallback to hardcoded data
  const serviceCards = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cards: any[] = [];
    const defaultIcon = "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=40&h=40&fit=crop&crop=center&auto=format";
    const timeIcon = "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=20&h=20&fit=crop&crop=center&auto=format";

    // Generate service cards from database clinics and doctors
    databaseClinics.forEach(clinic => {
      const doctors = clinicDoctors[clinic.id] || [];
      
      doctors.forEach(doctor => {
        // Check if doctor has services in the database
        if (doctor.services && doctor.services.trim().length > 0) {
          // Parse comma-separated services string
          const doctorServices = doctor.services.split(',').map(s => s.trim()).filter(s => s.length > 0);
          
          // Create a service card for each service this doctor provides
          doctorServices.forEach(serviceName => {
            cards.push({
              clinicName: clinic.name,
              address: clinic.address,
              serviceName: serviceName,
              specialty: doctor.specialty,
              timeSchedule: '9:00 AM – 6:00 PM • Mon–Sat', // Default schedule
              serviceIcon: defaultIcon,
              clinicIcon: clinic.logo_url || defaultIcon,
              timeIcon: timeIcon,
              serviceId: `doctor-${doctor.id}-${serviceName.toLowerCase().replace(/\s+/g, '-')}`,
              doctorName: doctor.name,
              doctorId: doctor.id
            });
          });
        }
      });
    });

    // Always add hardcoded service cards for all hardcoded clinics (for UI purposes)
    clinicsData.forEach(clinic => {
      Object.entries(clinic.categories).forEach(([categoryName, services]) => {
        services.forEach(service => {
          cards.push({
            clinicName: clinic.name,
            address: clinic.address,
            serviceName: service.name,
            specialty: categoryName,
            timeSchedule: `${clinic.timing} • ${clinic.daysOpen}`,
            serviceIcon: defaultIcon,
            clinicIcon: clinic.logo,
            timeIcon: timeIcon,
            serviceId: service.id,
            doctorName: service.doctorName
          });
        });
      });
    });

    console.log('✅ Generated service cards (database + hardcoded):', cards.length);
    console.log('📋 Service cards by clinic:', cards.reduce((acc, card) => {
      acc[card.clinicName] = (acc[card.clinicName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>));

    return cards;
  }, [databaseClinics, clinicDoctors]);

  // Generate clinic cards - merge database clinics with hardcoded data
  const clinicCards = useMemo(() => {
    const defaultIcon = "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=40&h=40&fit=crop&crop=center&auto=format";
    const daysIcon = "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=20&h=20&fit=crop&crop=center&auto=format";
    const timingIcon = "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=20&h=20&fit=crop&crop=center&auto=format";

    // Start with database clinics
    const dbClinicCards = databaseClinics.map(clinic => {
      // Try to find matching hardcoded clinic for services/timing
      const hardcodedClinic = clinicsData.find(c => c.name.toLowerCase() === clinic.name.toLowerCase());
      
      return {
        id: clinic.id,
        name: clinic.name,
        address: clinic.address,
        type: hardcodedClinic?.type || 'Medical Center',
        services: (clinic.specialties || []).slice(0, 4).map(specialty => ({
          name: specialty,
          icon: defaultIcon
        })).concat((clinic.specialties || []).length > 4 ? [{ name: t('More'), icon: defaultIcon }] : []),
        doctorCount: hardcodedClinic?.doctorCount || 'Multiple Doctors',
        daysOpen: hardcodedClinic?.daysOpen || 'Mon – Sat',
        timing: hardcodedClinic?.timing || '9:00 AM – 6:00 PM',
        // IMPORTANT: never borrow another clinic's hardcoded logo for DB clinics.
        // If logo_url is missing, ClinicCard will render neutral initial avatar fallback.
        logo: clinic.logo_url || '',
        daysIcon: daysIcon,
        timingIcon: timingIcon
      };
    });

    // Always add all hardcoded clinics (for UI purposes)
    const hardcodedClinicCards = clinicsData.map(clinic => ({
      id: clinic.id,
      name: clinic.name,
      address: clinic.address,
      type: clinic.type,
      services: Object.keys(clinic.categories).slice(0, 4).map(categoryName => ({
        name: categoryName,
        icon: defaultIcon
      })).concat(Object.keys(clinic.categories).length > 4 ? [{ name: t('More'), icon: defaultIcon }] : []),
      doctorCount: clinic.doctorCount,
      daysOpen: clinic.daysOpen,
      timing: clinic.timing,
      logo: clinic.logo,
      daysIcon: daysIcon,
      timingIcon: timingIcon
    }));

    // Merge database and hardcoded clinics, prioritizing database clinics if names match
    const mergedClinicCards = [...dbClinicCards];
    hardcodedClinicCards.forEach(hc => {
      const existsInDb = mergedClinicCards.some(dc => 
        dc.name.toLowerCase() === hc.name.toLowerCase()
      );
      if (!existsInDb) {
        mergedClinicCards.push(hc);
      }
    });

    return mergedClinicCards;
  }, [databaseClinics]);

  // Generate service mapping from clinic data
  const serviceMapping: { [key: string]: string[] } = useMemo(() => {
    const mapping: { [key: string]: string[] } = { 'all': [] };
    
    // Map category IDs to their actual category names
    const categoryMap: { [key: string]: string } = {
      'dermatology': 'Dermatology',
      'dentistry': 'Dental'
    };
    
    // Add main categories
    Object.entries(categoryMap).forEach(([categoryId, categoryName]) => {
      mapping[categoryId] = [categoryName];
    });
    
    // Add individual services - when a specific service is selected, show only that service
    getAllServices().forEach(service => {
      mapping[service.id] = [service.name];
    });
    
    return mapping;
  }, []);

  const matchesSelectedCategory = (specialty: string, serviceName: string) => {
    if (!selectedCategory || selectedCategory === 'all') return true;

    const allowedItems = serviceMapping[selectedCategory] || [];
    const selectedSpecialty = superAdminSpecialties.find(
      (item) =>
        item.id === selectedCategory ||
        item.name.toLowerCase() === selectedCategory.toLowerCase()
    );
    const isMainCategory =
      allowedItems.length === 1 &&
      (allowedItems[0] === 'Dermatology' || allowedItems[0] === 'Dental');

    if (isMainCategory) {
      return mapSpecialtyToCategory(specialty) === selectedCategory;
    }

    if (allowedItems.length > 0) {
      return allowedItems.includes(serviceName);
    }

    if (selectedSpecialty) {
      return specialty.trim().toLowerCase() === selectedSpecialty.name.trim().toLowerCase();
    }

    return true;
  };

  const realClinicSearchOptions = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'all') {
      return [];
    }

    const selectedSpecialty = superAdminSpecialties.find(
      (specialty) =>
        specialty.id === selectedCategory ||
        specialty.name.toLowerCase() === selectedCategory.toLowerCase()
    );

    const targetSpecialtyName = (selectedSpecialty?.name || selectedCategory).trim().toLowerCase();
    const isMainCategorySelected =
      selectedCategory === 'dermatology' || selectedCategory === 'dentistry';
    const seenServiceNames = new Set<string>();
    const options: Array<{ id: string; name: string; category: string; type: 'subcategory' }> = [];

    serviceCards
      .filter((card) => {
        if (!card.serviceId.startsWith('doctor-')) {
          return false;
        }

        if (isMainCategorySelected) {
          return mapSpecialtyToCategory(card.specialty) === selectedCategory;
        }

        return card.specialty.trim().toLowerCase() === targetSpecialtyName;
      })
      .filter((card) => {
        const normalizedServiceName = card.serviceName.trim().toLowerCase();
        if (!normalizedServiceName || seenServiceNames.has(normalizedServiceName)) {
          return false;
        }

        seenServiceNames.add(normalizedServiceName);
        return true;
      })
      .forEach((card) => {
        options.push({
          id: card.serviceId,
          name: card.serviceName,
          category: card.specialty,
          type: 'subcategory',
        });
      });

    approvedClinicServices
      .filter((service) => {
        if (isMainCategorySelected) {
          return mapSpecialtyToCategory(service.specialtyName) === selectedCategory;
        }

        return service.specialtyName.trim().toLowerCase() === targetSpecialtyName;
      })
      .forEach((service) => {
        const normalizedServiceName = service.serviceName.trim().toLowerCase();
        if (!normalizedServiceName || seenServiceNames.has(normalizedServiceName)) {
          return;
        }

        seenServiceNames.add(normalizedServiceName);
        options.push({
          id: `clinic-service-${service.id}`,
          name: service.serviceName,
          category: service.specialtyName,
          type: 'subcategory',
        });
      });

    superAdminServices
      .filter((service) => {
        if (isMainCategorySelected) {
          return mapSpecialtyToCategory(service.specialty_name) === selectedCategory;
        }

        return service.specialty_name.trim().toLowerCase() === targetSpecialtyName;
      })
      .forEach((service) => {
        const normalizedServiceName = service.name.trim().toLowerCase();
        if (!normalizedServiceName || seenServiceNames.has(normalizedServiceName)) {
          return;
        }

        seenServiceNames.add(normalizedServiceName);
        options.push({
          id: `super-${service.id}`,
          name: service.name,
          category: service.specialty_name,
          type: 'subcategory',
        });
      });

    return options.sort((left, right) => left.name.localeCompare(right.name));
  }, [approvedClinicServices, selectedCategory, serviceCards, superAdminServices, superAdminSpecialties]);

  const handleCategoryChange = (categoryId: string) => {
    // Clear search query when switching categories to reset subcategory selection
    setSearchQuery('');
    setSelectedCategory(categoryId);
    setSelectedService(''); // Clear selected service when category changes
    setSelectedServiceId(''); // Clear selected service ID when category changes
    setViewMode('services'); // Switch back to services view
  };

  // Wrapper for viewMode change that preserves selectedCategory when switching views
  const handleViewModeChange = (mode: 'services' | 'clinics') => {
    // Never clear selectedCategory when switching views - preserve it so user can navigate back
    // The selectedCategory should persist across view mode changes
    setViewMode(mode);
  };

  const handleClinicBooking = (clinicName: string) => {
    console.log('🎯 handleClinicBooking called with clinicName:', clinicName);
    console.log('📋 Current state:', {
      selectedService,
      selectedServiceId,
      selectedCategory,
      viewMode
    });
    console.log('📋 Available clinics:', clinicCards.map(c => c.name));
    
    if (!clinicName || clinicName.trim() === '') {
      console.error('❌ Empty clinic name passed to handleClinicBooking');
      return;
    }
    
    // Find the clinic card to get the actual clinic ID
    const clinicCard = clinicCards.find(c => 
      c.name.toLowerCase() === clinicName.toLowerCase()
    );
    
    // If a service is already selected, navigate to ServiceDetails page with the selected service
    if (selectedService && selectedService.trim() && selectedServiceId && selectedServiceId.trim()) {
      console.log('✅ Service is selected, navigating to ServiceDetails...');
      
      // Prefer the exact selected service id if it already belongs to this clinic.
      const exactServiceCard = serviceCards.find(card =>
        card.serviceId === selectedServiceId &&
        card.clinicName.toLowerCase() === clinicName.toLowerCase()
      );

      // Fall back to clinic + service matching, constrained by the current specialty.
      const matchingServiceCard = exactServiceCard || serviceCards.find(card =>
        card.serviceName.toLowerCase() === selectedService.toLowerCase() &&
        card.clinicName.toLowerCase() === clinicName.toLowerCase() &&
        matchesSelectedCategory(card.specialty, card.serviceName)
      );

      const matchingApprovedClinicService = approvedClinicServices.find((service) =>
        service.serviceName.toLowerCase() === selectedService.toLowerCase() &&
        service.clinicName.toLowerCase() === clinicName.toLowerCase() &&
        matchesSelectedCategory(service.specialtyName, service.serviceName)
      );

      const selectedSpecialtyForNavigation =
        matchingServiceCard?.specialty ||
        matchingApprovedClinicService?.specialtyName ||
        (selectedCategory === 'dentistry'
          ? 'Dental'
          : selectedCategory === 'dermatology'
            ? 'Dermatology'
            : undefined);
      
      // Use the stored serviceId or the one from matching card
      const serviceIdToUse =
        matchingServiceCard?.serviceId ||
        (matchingApprovedClinicService ? `clinic-service-${matchingApprovedClinicService.id}` : selectedServiceId);
      
      console.log('🔍 Service ID to use:', serviceIdToUse);
      console.log('🔍 Matching service card:', matchingServiceCard);
      
      if (serviceIdToUse) {
        // Get the actual clinic ID (UUID) if it's a database clinic, otherwise use clinic name
        const actualClinicId = matchingApprovedClinicService?.clinicId ||
          (clinicCard?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clinicCard.id)
            ? clinicCard.id
            : clinicName); // For hardcoded clinics, use name as fallback
        
        console.log('✅ Navigating to ServiceDetails with:', {
          serviceId: serviceIdToUse,
          clinicId: actualClinicId,
          clinicName: clinicName
        });
        
        // Navigate to service details page which has date/time selection
        navigate(`/service/${serviceIdToUse}`, {
          state: {
            clinicId: actualClinicId, // Pass actual clinic ID (UUID) or name
            clinicName: clinicName,
            isDatabaseService: serviceIdToUse.startsWith('doctor-') || serviceIdToUse.startsWith('clinic-service-'),
            selectedSpecialty: selectedSpecialtyForNavigation,
            selectedServiceName: selectedService,
          }
        });
        return;
      } else {
        console.error('❌ No serviceId found, cannot navigate');
      }
    } else {
      console.log('⚠️ No service selected, opening booking modal instead');
    }
    
    // If no service is selected, open the booking modal (fallback behavior)
    selectedClinicRef.current = clinicName;
    setSelectedClinic(clinicName);
    setIsBookingModalOpen(true);
    console.log('✅ Selected clinic set to:', clinicName);
  };

  // Get clinic services for the selected clinic (memoized to recalculate when dependencies change)
  const getSelectedClinicServices = useMemo(() => {
    // Use ref value if state is not yet updated (for immediate access)
    const clinicName = selectedClinicRef.current || selectedClinic;
    console.log('🔍 getSelectedClinicServices called for clinic:', clinicName);
    console.log('📋 Available database clinics:', databaseClinics.map(c => c.name));
    console.log('👨‍⚕️ Clinic doctors data:', clinicDoctors);
    
    // Early return if no clinic is selected
    if (!clinicName || clinicName.trim() === '') {
      console.log('⚠️ No clinic selected, returning empty services');
      return [];
    }
    
    // First try database clinic (case-insensitive match)
    const dbClinic = databaseClinics.find(c => 
      c.name.toLowerCase().trim() === clinicName.toLowerCase().trim()
    );
    
    if (dbClinic) {
      console.log('✅ Found database clinic:', dbClinic.name, 'ID:', dbClinic.id);
      // Get doctors for this clinic from database
      const doctors = clinicDoctors[dbClinic.id] || [];
      console.log('👨‍⚕️ Doctors for this clinic:', doctors.length, doctors);
      
      if (doctors.length > 0) {
        // Convert doctors to services format
        // Parse actual services from doctors' services column (comma-separated)
        const services: Array<{id: string, name: string, category: string, doctorName: string, doctorId: string}> = [];
        
        doctors.forEach(doctor => {
          // Check if doctor has services in the database
          if (doctor.services && doctor.services.trim().length > 0) {
            // Parse comma-separated services string
            const doctorServices = doctor.services.split(',').map(s => s.trim()).filter(s => s.length > 0);
            
            // Create a service entry for each service this doctor provides
            doctorServices.forEach(serviceName => {
              services.push({
                id: `doctor-${doctor.id}-${serviceName.toLowerCase().replace(/\s+/g, '-')}`,
                name: serviceName,
                category: doctor.specialty, // Use specialty as category
                doctorName: doctor.name,
                doctorId: doctor.id
              });
            });
          } else {
            // If no services, use specialty as fallback
            services.push({
              id: `doctor-${doctor.id}`,
              name: doctor.specialty,
              category: doctor.specialty,
              doctorName: doctor.name,
              doctorId: doctor.id
            });
          }
        });
        
        console.log('✅ Created services from doctors:', services);
        
        // Also merge with hardcoded services if available for backward compatibility
        const hardcodedClinic = clinicsData.find(c => 
          c.name.toLowerCase().trim() === clinicName.toLowerCase().trim()
        );
        if (hardcodedClinic) {
          console.log('📝 Also found hardcoded clinic, merging services');
          Object.entries(hardcodedClinic.categories).forEach(([categoryName, serviceList]) => {
            serviceList.forEach(service => {
              // Only add if not already added from database doctors
              if (!services.find(s => s.name === service.name && s.doctorName === service.doctorName)) {
                services.push({
                  id: service.id,
                  name: service.name,
                  category: categoryName,
                  doctorName: service.doctorName,
                  doctorId: '' // No doctor ID for hardcoded services
                });
              }
            });
          });
        }
        
        console.log('✅ Final services list:', services);
        return services.filter((service) =>
          matchesSelectedCategory(service.category, service.name)
        );
      }
      
      console.log('⚠️ No doctors found in database for clinic:', dbClinic.name);
      // If no doctors in database, fall back to hardcoded if available
      const hardcodedClinic = clinicsData.find(c => 
        c.name.toLowerCase().trim() === clinicName.toLowerCase().trim()
      );
      if (hardcodedClinic) {
        console.log('📝 Using hardcoded services as fallback');
        const services: Array<{id: string, name: string, category: string, doctorName: string, doctorId: string}> = [];
        Object.entries(hardcodedClinic.categories).forEach(([categoryName, serviceList]) => {
          serviceList.forEach(service => {
            services.push({
              id: service.id,
              name: service.name,
              category: categoryName,
              doctorName: service.doctorName,
              doctorId: ''
            });
          });
        });
        return services.filter((service) =>
          matchesSelectedCategory(service.category, service.name)
        );
      }
      
      console.log('❌ No services found (no doctors, no hardcoded data)');
      return [];
    }
    
    console.log('⚠️ Database clinic not found, trying hardcoded');
    // Fall back to hardcoded clinic
    const clinic = clinicsData.find(c => 
      c.name.toLowerCase().trim() === clinicName.toLowerCase().trim()
    );
    if (!clinic) {
      console.log('❌ Hardcoded clinic also not found for:', clinicName);
      return [];
    }
    
    console.log('✅ Found hardcoded clinic, using its services');
    const services: Array<{id: string, name: string, category: string, doctorName: string, doctorId: string}> = [];
    Object.entries(clinic.categories).forEach(([categoryName, serviceList]) => {
      serviceList.forEach(service => {
        services.push({
          id: service.id,
          name: service.name,
          category: categoryName,
          doctorName: service.doctorName,
          doctorId: ''
        });
      });
    });
    return services.filter((service) =>
      matchesSelectedCategory(service.category, service.name)
    );
  }, [selectedClinic, databaseClinics, clinicDoctors, matchesSelectedCategory]);

  // Convert timeSchedule string to schedule object
  const parseTimeSchedule = (timeSchedule: string): Record<string, string> => {
    const schedule: Record<string, string> = {
      'Sun': 'Closed',
      'Mon': 'Closed',
      'Tue': 'Closed', 
      'Wed': 'Closed',
      'Thu': 'Closed',
      'Fri': 'Closed',
      'Sat': 'Closed'
    };

    // Parse schedule like "9:00 AM – 1:00 PM • Mon–Sat"
    const parts = timeSchedule.split(' • ');
    if (parts.length === 2) {
      const timeRange = parts[0].trim();
      const days = parts[1].trim();
      
      // Convert time format from "9:00 AM – 1:00 PM" to "09:00 - 13:00"
      const convertTime = (time: string) => {
        return time.replace(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*–\s*(\d{1,2}):(\d{2})\s*(AM|PM)/g, (match, startHour, startMinute, startPeriod, endHour, endMinute, endPeriod) => {
          let startH = parseInt(startHour);
          let endH = parseInt(endHour);
          
          if (startPeriod === 'PM' && startH !== 12) startH += 12;
          if (startPeriod === 'AM' && startH === 12) startH = 0;
          if (endPeriod === 'PM' && endH !== 12) endH += 12;
          if (endPeriod === 'AM' && endH === 12) endH = 0;
          
          return startH.toString().padStart(2, '0') + ':' + startMinute + ' - ' + endH.toString().padStart(2, '0') + ':' + endMinute;
        });
      };
      
      const convertedTimeRange = convertTime(timeRange);
      
      // Parse day range like "Mon–Sat" or "Tue–Sat"
      if (days.includes('–')) {
        const [startDay, endDay] = days.split('–');
        const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const startIndex = dayOrder.indexOf(startDay.trim());
        const endIndex = dayOrder.indexOf(endDay.trim());
        
        if (startIndex !== -1 && endIndex !== -1) {
          for (let i = startIndex; i <= endIndex; i++) {
            schedule[dayOrder[i]] = convertedTimeRange;
          }
        }
      }
    }
    
    return schedule;
  };

  // Get schedule for selected clinic
  const getSelectedClinicSchedule = (): Record<string, string> => {
    // Use ref value if state is not yet updated (for immediate access)
    const clinicName = selectedClinicRef.current || selectedClinic;
    if (!clinicName || clinicName.trim() === '') {
      return {};
    }
    
    // First try to find in serviceCards (for service view)
    const clinicService = serviceCards.find(card => card.clinicName === clinicName);
    if (clinicService) {
      return parseTimeSchedule(clinicService.timeSchedule);
    }
    
    // Fallback: try to find in clinicCards (for clinic view)
    const clinicCard = clinicCards.find(card => card.name === clinicName);
    if (clinicCard) {
      // Return a default schedule based on clinic's timing
      // Format: "Mon–Sat: 9:00 AM – 6:00 PM" -> parse it
      const defaultSchedule: Record<string, string> = {
        'Mon': clinicCard.timing || '9:00 AM – 6:00 PM',
        'Tue': clinicCard.timing || '9:00 AM – 6:00 PM',
        'Wed': clinicCard.timing || '9:00 AM – 6:00 PM',
        'Thu': clinicCard.timing || '9:00 AM – 6:00 PM',
        'Fri': clinicCard.timing || '9:00 AM – 6:00 PM',
        'Sat': clinicCard.timing || '9:00 AM – 6:00 PM',
        'Sun': 'Closed'
      };
      return defaultSchedule;
    }
    
    return {};
  };

  const handleDateSelect = (date: Date) => {
    console.log('Selected date:', date);
    // You can add booking logic here
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleOptionSelect = (option: any) => {
    console.log('🎯 handleOptionSelect called with option:', option);
    
    // If it's a subcategory (service), switch to clinics view and filter by that service
    if (option.type === 'subcategory') {
      console.log('✅ Service selected:', option.name, 'ID:', option.id);
      setSelectedService(option.name); // Store the selected service name
      setSelectedServiceId(option.id); // Store the selected service ID for navigation
      setSearchQuery(option.name); // Set search query for display
      setViewMode('clinics'); // Switch to clinics view to show clinics offering this service
      console.log('✅ Switched to clinics view, service stored:', {
        name: option.name,
        id: option.id
      });
    } else {
      // If it's a main category, set it as selected category
      console.log('✅ Category selected:', option.id);
      setSelectedCategory(option.id);
      setSearchQuery(''); // Clear search when selecting main category
      setSelectedService(''); // Clear selected service
      setSelectedServiceId(''); // Clear selected service ID
      setViewMode('services'); // Stay in services view
    }
  };

  // Filter service cards based on selected category and search query
  const filteredServiceCards = useMemo(() => {
    let filtered = serviceCards;
    
    // If there's a search query, filter by search term within the selected category
    if (searchQuery.trim()) {
      // First filter by selected category if one is selected
      if (selectedCategory && selectedCategory !== 'all') {
        const allowedItems = serviceMapping[selectedCategory] || [];
        
        if (allowedItems.length > 0) {
          // Check if it's a main category (like 'Dermatology', 'Dental')
          const isMainCategory = allowedItems.length === 1 && 
            (allowedItems[0] === 'Dermatology' || allowedItems[0] === 'Dental');
          
          if (isMainCategory) {
            // If main category is selected, filter by specialty and search query
            filtered = filtered.filter(card =>
              card.specialty.toLowerCase().includes(allowedItems[0].toLowerCase()) &&
              (card.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
               card.clinicName.toLowerCase().includes(searchQuery.toLowerCase()))
            );
          } else {
            // Filter by specific service name (subcategory selected)
            filtered = filtered.filter(card => 
              allowedItems.includes(card.serviceName)
            );
          }
        }
      } else {
        // No category selected, search across all services
        filtered = filtered.filter(card =>
          card.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          card.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
          card.clinicName.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
    } else {
      // No search query: use category filtering
      if (selectedCategory && selectedCategory !== 'all') {
        const allowedItems = serviceMapping[selectedCategory] || [];
        
        if (allowedItems.length > 0) {
          // Check if it's a main category (like 'Dermatology', 'Dental')
          const isMainCategory = allowedItems.length === 1 && 
            (allowedItems[0] === 'Dermatology' || allowedItems[0] === 'Dental');
          
          if (isMainCategory) {
            // Main category selection should represent all services in that specialty.
            filtered = filtered.filter(card =>
              mapSpecialtyToCategory(card.specialty) === selectedCategory
            );
          } else {
            // Filter by specific service name (subcategory selected)
            filtered = filtered.filter(card => 
              allowedItems.includes(card.serviceName)
            );
          }
        }
      } else {
        // If no category selected, show empty state
        filtered = [];
      }
    }
    
    return filtered;
  }, [selectedCategory, searchQuery, serviceCards, serviceMapping]);

  // Filter clinic cards based on search query and selected service
  const filteredClinicCards = useMemo(() => {
    let filtered = clinicCards;
    
    // First filter by selected service if one is selected
    if (selectedService.trim()) {
      const shouldUseDatabaseServicesOnly =
        selectedServiceId.trim().startsWith('doctor-') ||
        selectedServiceId.trim().startsWith('clinic-service-');

      // Get all service cards that match the selected service
      const matchingServiceCards = serviceCards.filter(card => 
        card.serviceName.toLowerCase() === selectedService.toLowerCase() &&
        matchesSelectedCategory(card.specialty, card.serviceName) &&
        (!shouldUseDatabaseServicesOnly || card.serviceId.startsWith('doctor-'))
      );

      const matchingApprovedClinicServices = approvedClinicServices.filter((service) =>
        service.serviceName.toLowerCase() === selectedService.toLowerCase() &&
        matchesSelectedCategory(service.specialtyName, service.serviceName)
      );
      
      // Get unique clinic names from matching service cards
      const clinicNamesWithService = new Set([
        ...matchingServiceCards.map(card => card.clinicName.toLowerCase()),
        ...matchingApprovedClinicServices.map(service => service.clinicName.toLowerCase()),
      ]);
      
      // Filter clinics to only show those offering the selected service
      filtered = filtered.filter(clinic =>
        clinicNamesWithService.has(clinic.name.toLowerCase())
      );
    }
    
    // Then apply clinic search query filter if present
    if (clinicSearchQuery.trim()) {
      const normalizedQuery = clinicSearchQuery.toLowerCase().trim();
      const selectedServiceName = selectedService.trim().toLowerCase();
      const shouldUseDatabaseServicesOnly =
        selectedServiceId.trim().startsWith('doctor-') ||
        selectedServiceId.trim().startsWith('clinic-service-');
      filtered = filtered.filter(clinic => {
        const matchesClinicFields =
          clinic.name.toLowerCase().includes(normalizedQuery) ||
          clinic.address.toLowerCase().includes(normalizedQuery) ||
          clinic.type.toLowerCase().includes(normalizedQuery);

        if (matchesClinicFields) return true;

        // Match doctors from database doctors map (for DB clinics),
        // scoped to selected service when one is selected.
        const dbDoctors = clinic.id ? (clinicDoctors[clinic.id] || []) : [];
        const dbDoctorMatch = dbDoctors.some((doctor) => {
          const nameMatches = doctor.name.toLowerCase().includes(normalizedQuery);
          if (!nameMatches) return false;
          if (!selectedServiceName) return true;

          const doctorServices = (doctor.services || '')
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);
          return doctorServices.includes(selectedServiceName);
        });

        if (dbDoctorMatch) {
          return true;
        }

        // Match doctors from generated service cards (covers hardcoded + merged data),
        // also scoped to selected service when available.
        const serviceDoctorMatch = serviceCards.some((card) => {
          if (card.clinicName.toLowerCase() !== clinic.name.toLowerCase()) return false;
          if (selectedServiceName && card.serviceName.toLowerCase() !== selectedServiceName) return false;
          if (selectedServiceName && !matchesSelectedCategory(card.specialty, card.serviceName)) return false;
          if (shouldUseDatabaseServicesOnly && !card.serviceId.startsWith('doctor-')) return false;
          return (card.doctorName || '').toLowerCase().includes(normalizedQuery);
        });

        return serviceDoctorMatch;
      });
    }
    
    return filtered;
  }, [approvedClinicServices, clinicCards, clinicDoctors, clinicSearchQuery, selectedCategory, selectedService, selectedServiceId, serviceCards]);

  const parseNumericPrice = (price: string | number | null | undefined): number | null => {
    if (price === null || price === undefined) return null;
    const raw = String(price).trim();
    if (!raw) return null;
    const numeric = Number(raw.replace(/[^0-9.]/g, ''));
    return Number.isFinite(numeric) ? numeric : null;
  };

  const formatStartingPrice = (price: number): string => {
    const locale = isRtl ? 'ar' : 'en-US';
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(price);
  };

  const startingPriceByClinic = useMemo(() => {
    const map: Record<string, string> = {};
    const selectedServiceName = selectedService.trim().toLowerCase();

    if (!selectedServiceName) {
      return map;
    }

    clinicCards.forEach((clinic) => {
      const clinicKey = clinic.id || clinic.name;
      const doctors = clinic.id ? (clinicDoctors[clinic.id] || []) : [];
      const matchingPrices = doctors
        .filter((doctor) => {
          const doctorServices = (doctor.services || '')
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);
          return doctorServices.includes(selectedServiceName);
        })
        .map((doctor) => parseNumericPrice(doctor.price))
        .filter((value): value is number => value !== null);

      if (matchingPrices.length > 0) {
        map[clinicKey] = formatStartingPrice(Math.min(...matchingPrices));
      }
    });

    return map;
  }, [clinicCards, clinicDoctors, isRtl, selectedService]);

  return (
    <div className="min-h-screen bg-gray-100 pb-20 sm:pb-0">{/* Added bottom padding for mobile nav */}
      <Header 
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />
      <HeroSection 
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
        superAdminSpecialties={superAdminSpecialties}
      />
      
      {/* Text below the blue section */}
      {viewMode === 'services' && selectedCategory && (
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <p className={`text-gray-700 text-sm sm:text-base font-normal tracking-[-0.32px] ${isRtl ? 'text-right' : 'text-left'}`}>
            <span className="text-gray-700 font-medium">{t('Step 02')}</span> {t('Please choose a service')}
          </p>
        </div>
      )}
      
      <main>


        
        {/* Services Section - only show when services is selected */}
        {viewMode === 'services' && (
          <section className="flex w-full flex-col items-stretch mt-2 sm:mt-4 px-4 sm:px-6 lg:px-8 pb-20 sm:pb-8">
            <div className="w-full max-w-7xl mx-auto">
              {/* Search Bar above title - only show when specialty is selected */}
              {selectedCategory && (
                <div className="mb-4 w-full">
                  <SearchInput
                    onSearch={setSearchQuery}
                    onOptionSelect={handleOptionSelect}
                    selectedCategory={selectedCategory}
                    currentSearchQuery={searchQuery}
                    clinicServices={realClinicSearchOptions}
                    superAdminServices={superAdminServices}
                    superAdminSpecialties={superAdminSpecialties}
                  />
                </div>
              )}
              
              {/* Services are only shown in the search dropdown, not as cards below */}
              {!selectedCategory && (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="text-gray-500 text-lg font-medium mt-2">
                    {t('Pick a specialty first')}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}
        
        {/* Clinics Section - only show when clinics is selected */}
        {viewMode === 'clinics' && (
          <section className="flex w-full flex-col items-stretch mt-2 sm:mt-4 px-4 sm:px-6 lg:px-8 pb-20 sm:pb-8">
            <div id="clinic-section" className="w-full max-w-7xl mx-auto">
              {/* Clinic Search Bar */}
              <div className="mb-3">
                <div className="relative">
                  <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                    <svg className={`h-5 w-5 text-gray-400 ${isRtl ? '-scale-x-100' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder={t('Search by clinic name, location, or doctor...')}
                    value={clinicSearchQuery}
                    onChange={(e) => setClinicSearchQuery(e.target.value)}
                    dir={isRtl ? 'rtl' : 'ltr'}
                    className={`block w-full ${isRtl ? 'pr-10 pl-3 text-right' : 'pl-10 pr-3 text-left'} py-3 border border-gray-300 rounded-full leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm`}
                  />
                </div>
              </div>
              
              <h2 className="text-xl sm:text-2xl text-black font-normal tracking-[-1px] mb-3">
                {t('Choose Clinic')}
              </h2>
              
              {filteredClinicCards.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
                  {filteredClinicCards.map((clinic, index) => (
                    <ClinicCard 
                      key={index} 
                      {...clinic} 
                      startingPrice={startingPriceByClinic[clinic.id || clinic.name]}
                      onBookingClick={() => handleClinicBooking(clinic.name)}
                      hasSelectedService={!!(selectedService && selectedService.trim() && selectedServiceId && selectedServiceId.trim())}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 mb-4">
                    <svg width="68" height="68" viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g opacity="0.3">
                        <rect x="12" y="12" width="44" height="44" rx="22" stroke="#52B03B" strokeWidth="4"/>
                      </g>
                      <g opacity="0.1">
                        <rect x="2" y="2" width="64" height="64" rx="32" stroke="#52B03B" strokeWidth="4"/>
                      </g>
                      <path d="M32.2222 40.4443H35.7775V37.111H39.1109V33.5557H35.7775V30.2223H32.2222V33.5557H28.8889V37.111H32.2222V40.4443ZM23.3332 46V30L33.9999 22L44.6665 30V46H23.3332ZM25.5555 43.7777H42.4442V31.0223L33.9999 24.8223L25.5555 31.0223V43.7777Z" fill="#0C2243"/>
                    </svg>
                  </div>
                  <p className="text-gray-500 text-lg font-medium">
                    {clinicSearchQuery.trim()
                      ? t('No clinics found for "{{clinicSearchQuery}}"', { clinicSearchQuery })
                      : t('No clinics available')}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
      
      {/* Bottom Navigation - Mobile Only */}
      <BottomNavigation 
        viewMode={viewMode} 
        onViewModeChange={handleViewModeChange} 
      />

      {isBookingModalOpen && (
        <BookingModal 
          isOpen={isBookingModalOpen}
          onClose={() => {
            setIsBookingModalOpen(false);
            setSelectedClinic(''); // Reset selected clinic when modal closes
            selectedClinicRef.current = ''; // Reset ref as well
          }}
          clinicName={selectedClinicRef.current || selectedClinic}
          serviceSchedule={getSelectedClinicSchedule()}
          clinicServices={getSelectedClinicServices}
          doctorName={getSelectedClinicServices[0]?.doctorName || t('Dr. Available Doctor')}
        />
      )}
    </div>
  );
};

export default Index;
