import React, { useState, useMemo, useEffect, useRef } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isAfter, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import ServicesFilter from '@/components/ServicesFilter';
import ServiceCard from '@/components/ServiceCard';
import ClinicCard from '@/components/ClinicCard';
import BottomNavigation from '@/components/BottomNavigation';
import SearchInput from '@/components/SearchInput';
import { BookingModal } from '@/components/BookingModal';
import { clinicsData, getAllServices, getAllCategories } from '@/data/clinicsData';

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [viewMode, setViewMode] = useState<'services' | 'clinics'>('services');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<string>('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showDistanceFilter, setShowDistanceFilter] = useState(false);
  const [distanceFilter, setDistanceFilter] = useState<'nearest' | 'farthest' | null>(null);
  const [clinicSearchQuery, setClinicSearchQuery] = useState<string>('');
  const filterRef = useRef<HTMLDivElement>(null);

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

  // Generate service cards from clinic data
  const serviceCards = useMemo(() => {
    const cards: any[] = [];
    const defaultIcon = "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=40&h=40&fit=crop&crop=center&auto=format";
    const timeIcon = "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=20&h=20&fit=crop&crop=center&auto=format";

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
            serviceId: service.id, // Add the actual service ID
            doctorName: service.doctorName // Add the doctor name
          });
        });
      });
    });

    return cards;
  }, []);

  // Generate clinic cards from clinic data
  const clinicCards = useMemo(() => {
    const defaultIcon = "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=40&h=40&fit=crop&crop=center&auto=format";
    const daysIcon = "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=20&h=20&fit=crop&crop=center&auto=format";
    const timingIcon = "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=20&h=20&fit=crop&crop=center&auto=format";

    return clinicsData.map(clinic => ({
      id: clinic.id, // Add the clinic ID
      name: clinic.name,
      address: clinic.address,
      type: clinic.type,
      services: Object.keys(clinic.categories).slice(0, 4).map(categoryName => ({
        name: categoryName,
        icon: defaultIcon
      })).concat(Object.keys(clinic.categories).length > 4 ? [{ name: "More", icon: defaultIcon }] : []),
      doctorCount: clinic.doctorCount,
      daysOpen: clinic.daysOpen,
      timing: clinic.timing,
      logo: clinic.logo,
      daysIcon: daysIcon,
      timingIcon: timingIcon
    }));
  }, []);

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

  const handleCategoryChange = (categoryId: string) => {
    // Clear search query when switching categories to reset subcategory selection
    setSearchQuery('');
    setSelectedCategory(categoryId);
  };

  const handleClinicBooking = (clinicName: string) => {
    setSelectedClinic(clinicName);
    setIsBookingModalOpen(true);
  };

  // Get clinic services for the selected clinic
  const getSelectedClinicServices = () => {
    const clinic = clinicsData.find(c => c.name === selectedClinic);
    if (!clinic) return [];
    
    const services: Array<{id: string, name: string, category: string, doctorName: string}> = [];
    Object.entries(clinic.categories).forEach(([categoryName, serviceList]) => {
      serviceList.forEach(service => {
        services.push({
          id: service.id,
          name: service.name,
          category: categoryName,
          doctorName: service.doctorName
        });
      });
    });
    return services;
  };

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
    const clinicService = serviceCards.find(card => card.clinicName === selectedClinic);
    return clinicService ? parseTimeSchedule(clinicService.timeSchedule) : {};
  };

  const handleDateSelect = (date: Date) => {
    console.log('Selected date:', date);
    // You can add booking logic here
  };

  const handleOptionSelect = (option: any) => {
    // If it's a subcategory, keep the parent category selected and set search query
    if (option.type === 'subcategory') {
      // Don't change selectedCategory, just set the search query to show the subcategory
      setSearchQuery(option.name);
    } else {
      // If it's a main category, set it as selected category
      setSelectedCategory(option.id);
      setSearchQuery(''); // Clear search when selecting main category
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
            // If main category is selected, show empty state (no services until subcategory is selected)
            filtered = [];
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

  // Filter clinic cards based on search query
  const filteredClinicCards = useMemo(() => {
    if (!clinicSearchQuery.trim()) {
      return clinicCards;
    }
    
    return clinicCards.filter(clinic =>
      clinic.name.toLowerCase().includes(clinicSearchQuery.toLowerCase()) ||
      clinic.address.toLowerCase().includes(clinicSearchQuery.toLowerCase()) ||
      clinic.type.toLowerCase().includes(clinicSearchQuery.toLowerCase())
    );
  }, [clinicCards, clinicSearchQuery]);

  return (
    <div className="min-h-screen bg-gray-100 pb-20 sm:pb-0">{/* Added bottom padding for mobile nav */}
      <Header 
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      <HeroSection 
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
      />
      
      {/* Text below the blue section */}
      {viewMode === 'services' && selectedCategory && (
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-gray-700 text-sm sm:text-base font-normal tracking-[-0.32px] text-left">
            <span className="text-gray-700 font-medium">Step 2</span> {searchQuery.trim() ? `Search results for "${searchQuery}"` : 'Please choose a service'}
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
                  />
                </div>
              )}
              
              {selectedCategory && (
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl sm:text-2xl text-black font-normal tracking-[-1px]">
                    Services available at
                  </h2>
                
                {/* Filter Button */}
                <div className="relative" ref={filterRef}>
                  <button
                    onClick={() => setShowDistanceFilter(!showDistanceFilter)}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Filter</span>
                    <svg className={`w-4 h-4 text-gray-600 transition-transform ${showDistanceFilter ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {/* Dropdown Menu */}
                  {showDistanceFilter && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setDistanceFilter('nearest');
                            setShowDistanceFilter(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                            distanceFilter === 'nearest' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Nearest
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            setDistanceFilter('farthest');
                            setShowDistanceFilter(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                            distanceFilter === 'farthest' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Farthest
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              )}
              
              {filteredServiceCards.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
                  {filteredServiceCards.map((card, index) => (
                    <ServiceCard
                      key={index}
                      {...card}
                      isSpecial={index === 6}
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
                    {searchQuery.trim() ? `No services found for "${searchQuery}"` : 
                     selectedCategory ? 'Pick a service first' : 'Pick a specialty first'}
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
              <div className="mb-6">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search clinics by name, address, or type..."
                    value={clinicSearchQuery}
                    onChange={(e) => setClinicSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-full leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>
              
              <h2 className="text-xl sm:text-2xl text-black font-normal tracking-[-1px] mb-4">
                Choose Clinic
              </h2>
              
              {filteredClinicCards.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
                  {filteredClinicCards.map((clinic, index) => (
                    <ClinicCard 
                      key={index} 
                      {...clinic} 
                      onBookingClick={() => handleClinicBooking(clinic.name)}
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
                    {clinicSearchQuery.trim() ? `No clinics found for "${clinicSearchQuery}"` : 'No clinics available'}
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
        onViewModeChange={setViewMode} 
      />

      <BookingModal 
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        clinicName={selectedClinic}
        serviceSchedule={getSelectedClinicSchedule()}
        clinicServices={getSelectedClinicServices()}
        doctorName={getSelectedClinicServices()[0]?.doctorName || 'Dr. Available Doctor'}
      />
    </div>
  );
};

export default Index;
