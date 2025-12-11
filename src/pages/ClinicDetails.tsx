import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import SearchInput from '@/components/SearchInput';
import { Button } from '@/components/ui/button';
import { Stethoscope, User } from 'lucide-react';
import { clinicsData, Clinic } from '@/data/clinicsData';
import { supabase } from '@/integrations/supabase/client';
import Image5 from '../assets/image 5.svg';

// Custom Tooth Icon Component
const ToothIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <img 
    src="/lovable-uploads/74f053c5-a248-4f63-812c-6ba128f47e0a.png" 
    width={size} 
    height={size} 
    alt="Tooth icon"
    className={className}
  />
);

// Custom Dermatology Icon Component
const DermatologyIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <img
    src={Image5}
    width={size}
    height={size}
    alt="Dermatology icon"
    className={className}
  />
);

// Others Icon Component - simple document icon
const OthersIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14,2 14,8 20,8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10,9 9,9 8,9" />
  </svg>
);

// Service category interface
interface ServiceCategory {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
}

// Service card interface
interface ServiceCard {
  id: string;
  name: string;
  category: string;
  time: string;
  date: string;
  icon: string;
}


const ClinicDetails = () => {
  const { clinicId } = useParams();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [databaseClinic, setDatabaseClinic] = useState<any>(null);
  const [clinicDoctors, setClinicDoctors] = useState<Array<{id: string, name: string, specialty: string, email: string | null, phone: string | null, availability: string | null, services?: string | null}>>([]);
  const [clinicServices, setClinicServices] = useState<Array<{specialty: string, service: string, doctorName: string, doctorId: string}>>([]);
  const [loading, setLoading] = useState(true);

  // Check if clinicId is a UUID (database clinic) or a slug (hardcoded clinic)
  const isUUID = clinicId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clinicId);

  // Fetch clinic from database if it's a UUID
  useEffect(() => {
    const fetchClinic = async () => {
      if (!clinicId) {
        setLoading(false);
        return;
      }

      if (isUUID) {
        // Fetch from database
        try {
          setLoading(true);
          const { data: clinicData, error: clinicError } = await supabase
            .from('clinics')
            .select('id, name, address, logo_url, specialties, description, status')
            .eq('id', clinicId)
            .eq('status', 'active')
            .maybeSingle();

          if (clinicError) {
            console.error('Error fetching clinic:', clinicError);
          } else if (clinicData) {
            console.log('✅ Fetched clinic from database:', clinicData);
            setDatabaseClinic(clinicData);

            // Fetch doctors for this clinic (including services column)
            const { data: doctorsData, error: doctorsError } = await supabase
              .from('doctors')
              .select('id, name, specialty, email, phone, availability, status, services')
              .eq('clinic_id', clinicData.id)
              .eq('status', 'active');

            if (doctorsError) {
              console.error('Error fetching doctors:', doctorsError);
            } else {
              console.log('✅ Fetched doctors:', doctorsData);
              setClinicDoctors(doctorsData || []);

              // Process services from doctors table (same logic as clinic admin)
              const serviceRows: Array<{specialty: string, service: string, doctorName: string, doctorId: string}> = [];
              
              doctorsData?.forEach((doctor) => {
                // Only process doctors that have services in the database
                if (doctor.services && doctor.services.trim().length > 0) {
                  // Parse comma-separated services string
                  const doctorServices = doctor.services.split(',').map(s => s.trim()).filter(s => s.length > 0);
                  
                  doctorServices.forEach(service => {
                    serviceRows.push({
                      specialty: doctor.specialty,
                      service: service,
                      doctorName: doctor.name,
                      doctorId: doctor.id,
                    });
                  });
                }
              });

              console.log('✅ Fetched clinic services:', serviceRows);
              setClinicServices(serviceRows);
            }
          }
        } catch (error) {
          console.error('Error in fetchClinic:', error);
        } finally {
          setLoading(false);
        }
      } else {
        // Not a UUID, it's a slug - use hardcoded data
        setLoading(false);
      }
    };

    fetchClinic();
  }, [clinicId, isUUID]);

  // Get clinic data - prioritize database clinic, fallback to hardcoded
  const currentClinic = useMemo(() => {
    if (databaseClinic) {
      // Convert database clinic to the format expected by the component
      // Convert doctors to categories/services
      const categories: Record<string, any[]> = {};
      
      clinicDoctors.forEach(doctor => {
        const specialty = doctor.specialty || 'General';
        if (!categories[specialty]) {
          categories[specialty] = [];
        }
        categories[specialty].push({
          id: `doctor-${doctor.id}`,
          name: specialty,
          category: specialty,
          doctorName: doctor.name
        });
      });

      return {
        id: databaseClinic.id,
        name: databaseClinic.name,
        address: databaseClinic.address || 'Location not specified',
        type: '',
        logo: databaseClinic.logo_url || '',
        timing: '9:00 AM – 6:00 PM',
        daysOpen: 'Mon – Sat',
        doctorCount: `${clinicDoctors.length} Doctor${clinicDoctors.length !== 1 ? 's' : ''}`,
        categories: categories
      };
    }

    // Fallback to hardcoded clinic
    return clinicsData.find(clinic => clinic.id === clinicId) || {
      id: 'unknown',
      name: 'Medical Center',
      address: 'Location not specified',
      type: '',
      logo: '',
      timing: '9:00 AM – 6:00 PM',
      daysOpen: 'Mon – Sat',
      doctorCount: 'Multiple Doctors',
      categories: {}
    };
  }, [databaseClinic, clinicDoctors, clinicId]);

  // Debug logging
  console.log('ClinicDetails - clinicId:', clinicId);
  console.log('ClinicDetails - isUUID:', isUUID);
  console.log('ClinicDetails - databaseClinic:', databaseClinic);
  console.log('ClinicDetails - clinicDoctors:', clinicDoctors);
  console.log('ClinicDetails - currentClinic:', currentClinic);

  // Helper function to map specialty to UI category (same logic as clinic admin)
  const mapSpecialtyToCategory = (specialty: string): string => {
    const specialtyLower = specialty.toLowerCase();
    
    // Dermatology category
    if (specialtyLower.includes('dermatology') || 
        specialtyLower.includes('skin') || 
        specialtyLower.includes('facial') ||
        specialtyLower.includes('acne') ||
        specialtyLower.includes('cosmetic dermatology')) {
      return 'dermatology';
    }
    
    // Dentistry category
    if (specialtyLower.includes('dental') || 
        specialtyLower.includes('dentistry') || 
        specialtyLower.includes('orthodontics') || 
        specialtyLower.includes('oral') ||
        specialtyLower.includes('tooth') ||
        specialtyLower.includes('teeth')) {
      return 'dentistry';
    }
    
    // Others category (default)
    return 'others';
  };

  // Service categories for filtering
  const serviceCategories: ServiceCategory[] = [
    { id: 'dermatology', name: 'Dermatology', icon: DermatologyIcon },
    { id: 'dentistry', name: 'Dental', icon: ToothIcon },
    { id: 'others', name: 'Others', icon: OthersIcon }
  ];

  // Generate service cards from clinic services (database) - same logic as clinic admin
  const serviceCards: ServiceCard[] = useMemo(() => {
    const cards: ServiceCard[] = [];
    
    // Use clinicServices from database (only services that exist in database)
    clinicServices.forEach(serviceRow => {
      const specialty = serviceRow.specialty; // This is the actual specialty (e.g., "Dermatology", "Orthopedics")
      const uiCategory = mapSpecialtyToCategory(specialty); // This is the UI category (dermatology, dentistry, others)
      
      // Generate service ID - format: doctor-{doctorId}-{service-name}
      // This matches what ServiceDetails.tsx expects
      const serviceId = `doctor-${serviceRow.doctorId}-${serviceRow.service.toLowerCase().replace(/\s+/g, '-')}`;
      
      // Generate mock time and date data (for display purposes)
      const times = ['10:15 am - 10:30 am', '9:45 am - 10:00 am', '11:00 am - 11:15 am', '2:30 pm - 2:45 pm'];
      const dates = ['24 Aug, 2025', '15 Sep, 2026', '28 Aug, 2025', '5 Sep, 2025'];
      const icons = ['👋', '❤️', '🦷', '👁️', '🧠', '💉'];
      
      cards.push({
        id: serviceId,
        name: serviceRow.service, // Use actual service name from database (e.g., "Consultation", "Skin Biopsy")
        category: specialty, // Store the actual specialty (e.g., "Dermatology", "Orthopedics") for booking
        time: times[Math.floor(Math.random() * times.length)],
        date: dates[Math.floor(Math.random() * dates.length)],
        icon: icons[Math.floor(Math.random() * icons.length)]
      });
    });
    
    return cards;
  }, [clinicServices]);

  // Filter service cards based on selected category
  const filteredServiceCards = useMemo(() => {
    // If no category is selected, return empty array (show empty state)
    if (!selectedCategory || selectedCategory === '') {
      return [];
    }
    
    // Filter by mapping the specialty to UI category
    // card.category contains the actual specialty (e.g., "Dermatology", "Orthopedics")
    // We need to map it to UI category (dermatology, dentistry, others) for filtering
    let filtered = serviceCards.filter(card => {
      const cardUiCategory = mapSpecialtyToCategory(card.category);
      return cardUiCategory === selectedCategory;
    });

    // Apply search filter if search query exists
    if (searchQuery.trim()) {
      filtered = filtered.filter(card => 
        card.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [serviceCards, selectedCategory, searchQuery]);

  // Handle service selection and navigate to service details
  const handleServiceSelect = (service: ServiceCard) => {
    console.log('🔍 Navigating to service:', service.id, 'from clinic:', currentClinic.id);
    // Navigate to the service details page using the service ID
    // If it's a database service (doctor-*), pass clinic context via state
    navigate(`/service/${service.id}`, {
      state: {
        clinicId: currentClinic.id,
        clinicName: currentClinic.name,
        isDatabaseService: service.id.startsWith('doctor-')
      }
    });
  };

  // Handle option select for search (no-op for clinic details)
  const handleOptionSelect = () => {
    // No action needed for clinic details search
  };

  // Clear search when category changes
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSearchQuery(''); // Clear search when changing category
  };

  // Generate clinic-specific services for search (from database)
  const getClinicServices = () => {
    if (!selectedCategory) return [];
    
    const services: any[] = [];
    
    console.log('getClinicServices - Clinic:', currentClinic.name);
    console.log('getClinicServices - Selected Category:', selectedCategory);
    console.log('getClinicServices - Clinic Services:', clinicServices);
    
    // Use clinicServices from database (same data as displayed in the list)
    clinicServices.forEach(serviceRow => {
      const specialty = serviceRow.specialty; // Actual specialty (e.g., "Dermatology", "Orthopedics")
      const uiCategory = mapSpecialtyToCategory(specialty); // UI category (dermatology, dentistry, others)
      
      // Only include if it matches the selected UI category
      if (uiCategory === selectedCategory) {
        const serviceId = `doctor-${serviceRow.doctorId}-${serviceRow.service.toLowerCase().replace(/\s+/g, '-')}`;
        
        services.push({
          id: serviceId,
          name: serviceRow.service, // Use actual service name from database
          category: specialty, // Store actual specialty (e.g., "Dermatology") for booking
          type: 'subcategory'
        });
      }
    });
    
    console.log('getClinicServices - Returning services:', services);
    return services;
  };


  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Clinic Header Section */}
      <section className="bg-[#0C2243] text-white pt-6 pb-4 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            {/* Clinic Icon/Logo */}
            {currentClinic.logo ? (
              <img
                src={currentClinic.logo}
                alt={currentClinic.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                <div className="w-8 h-8 bg-[#0C2243] rounded flex items-center justify-center">
                  <div className="w-4 h-4 bg-white rounded"></div>
                </div>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{currentClinic.name}</h1>
              <p className="text-sm text-gray-300">{currentClinic.address}</p>
            </div>
          </div>
          
          {/* Specialty Selection */}
          <div className="mb-3">
            <h2 className="text-sm sm:text-base font-normal text-white mb-3 tracking-[-0.32px]"><span className="text-[#00FFA2] font-medium">Step 01</span> <span className="text-white/90">Please choose a specialty:</span></h2>
            
            {/* Service Filter Buttons */}
            <div className="flex justify-center gap-2 sm:gap-3">
              {serviceCategories.map((category) => {
                const IconComponent = category.icon;
                const isOthers = category.id === 'others';
                
                return (
                  <div key={category.id} className="relative">
                    <button
                      onClick={isOthers ? undefined : () => handleCategoryChange(category.id)}
                      disabled={isOthers}
                      className={`flex flex-col items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-lg transition-all duration-200 text-xs font-medium relative ${
                        isOthers
                          ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                          : selectedCategory === category.id 
                            ? 'bg-[rgba(0,255,162,1)] text-[rgba(12,34,67,1)] shadow-sm' 
                            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`shrink-0 sm:w-6 sm:h-6 mb-1 flex items-center justify-center ${selectedCategory === category.id ? 'bg-white rounded-full p-1' : ''}`}>
                        <IconComponent size={20} className="shrink-0 sm:w-6 sm:h-6" />
                      </div>
                      <span className="text-[9px] sm:text-[11px] leading-[1.0] sm:leading-[1.1] text-center px-0.5 break-words hyphens-auto max-w-full overflow-hidden">
                        {category.name}
                      </span>
                    </button>
                    
                    {/* SOON Banner for Others button - positioned diagonally on top right corner */}
                    {isOthers && (
                      <div className="absolute top-1 -right-1 z-10">
                        <div className="bg-[#00FFA2] text-black px-2 py-1 text-[7px] sm:text-[8px] font-bold whitespace-nowrap shadow-sm transform rotate-45 rounded">
                          SOON
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-6 px-4">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg font-medium">Loading clinic information...</p>
            </div>
          ) : selectedCategory ? (
            <>
              <h2 className="text-sm font-medium text-gray-700 mb-4"><span className="text-[#0C2243] font-medium">Step 02</span> <span className="text-gray-500 font-normal">Please choose a service:</span></h2>

              {/* Search Bar */}
              <div className="mb-4 w-full">
                <SearchInput
                  onSearch={setSearchQuery}
                  onOptionSelect={handleOptionSelect}
                  selectedCategory={selectedCategory}
                  currentSearchQuery={searchQuery}
                  clinicServices={getClinicServices()}
                />
              </div>

              {/* Service Cards */}
              <div className="space-y-3">
                {filteredServiceCards.map((service) => (
                  <div
                    key={service.id}
                    className="bg-white rounded-lg p-3 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleServiceSelect(service)}
                  >
                    <div className="flex flex-col">
                      {/* Service Name */}
                      <h3 className="font-semibold text-gray-900 text-lg">{service.name}</h3>
                    </div>
                  </div>
                ))}
              </div>

              {filteredServiceCards.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No services found for the selected category.</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg font-medium">
                Pick a specialty first
              </p>
            </div>
          )}
        </div>
      </section>

    </div>
  );
};

export default ClinicDetails;