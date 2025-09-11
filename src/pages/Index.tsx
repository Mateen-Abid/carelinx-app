import React, { useState, useMemo } from 'react';
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'services' | 'clinics'>('services');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<string>('');
  const [currentDate, setCurrentDate] = useState(new Date());
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
            serviceId: service.id // Add the actual service ID
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
    setSelectedCategory(categoryId);
    // Clear search query when "All" is selected to reset all filters
    if (categoryId === 'all') {
      setSearchQuery('');
    }
  };

  const handleClinicBooking = (clinicName: string) => {
    setSelectedClinic(clinicName);
    setIsBookingModalOpen(true);
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
    setSelectedCategory(option.id);
    setSearchQuery(''); // Clear search when selecting from dropdown
  };

  // Filter service cards based on selected category and search query
  const filteredServiceCards = useMemo(() => {
    let filtered = serviceCards;
    
    // Filter by category first
    if (selectedCategory !== 'all') {
      const allowedItems = serviceMapping[selectedCategory] || [];
      
      if (allowedItems.length > 0) {
        // Check if it's a main category (like 'Dermatology', 'Dental')
        const isMainCategory = allowedItems.length === 1 && 
          (allowedItems[0] === 'Dermatology' || allowedItems[0] === 'Dental');
        
        if (isMainCategory) {
          // Filter by specialty for main categories
          filtered = filtered.filter(card => 
            card.specialty === allowedItems[0]
          );
        } else {
          // Filter by specific service name
          filtered = filtered.filter(card => 
            allowedItems.includes(card.serviceName)
          );
        }
      }
    }
    
    // Then filter by search query within the category
    if (searchQuery.trim()) {
      filtered = filtered.filter(card =>
        card.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.clinicName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [selectedCategory, searchQuery, serviceCards, serviceMapping]);

  // Show all clinic cards (no filtering needed)
  const filteredClinicCards = clinicCards;

  return (
    <div className="min-h-screen bg-gray-100 pb-20 sm:pb-0">{/* Added bottom padding for mobile nav */}
      <Header />
      <HeroSection 
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
      />
      
      <main>


        
        {/* Services Section - only show when services is selected */}
        {viewMode === 'services' && (
          <section className="flex w-full flex-col items-stretch mt-2 sm:mt-4 px-4 sm:px-6 lg:px-8 pb-20 sm:pb-8">
            <div className="w-full max-w-7xl mx-auto">
              {/* Search Bar above title */}
              <div className="mb-4 w-full">
                <SearchInput
                  placeholder="Search by service, clinic, or doctor's name"
                  onSearch={setSearchQuery}
                  onOptionSelect={handleOptionSelect}
                  selectedCategory={selectedCategory}
                  currentSearchQuery={searchQuery}
                />
              </div>
              
              <h2 className="text-xl sm:text-2xl text-black font-normal tracking-[-1px] mb-4">
                Services available at
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
                {filteredServiceCards.map((card, index) => (
                  <ServiceCard
                    key={index}
                    {...card}
                    isSpecial={index === 6}
                  />
                ))}
              </div>
            </div>
          </section>
        )}
        
        {/* Clinics Section - only show when clinics is selected */}
        {viewMode === 'clinics' && (
          <section className="flex w-full flex-col items-stretch mt-2 sm:mt-4 px-4 sm:px-6 lg:px-8 pb-20 sm:pb-8">
            <div id="clinic-section" className="w-full max-w-7xl mx-auto">
              <h2 className="text-xl sm:text-2xl text-black font-normal tracking-[-1px] mb-4">
                Clinics
              </h2>
              
              
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
                 {filteredClinicCards.map((clinic, index) => (
                   <ClinicCard 
                     key={index} 
                     {...clinic} 
                     onBookingClick={() => handleClinicBooking(clinic.name)}
                   />
                 ))}
               </div>
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
      />
    </div>
  );
};

export default Index;
