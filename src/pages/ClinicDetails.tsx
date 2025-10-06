import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import SearchInput from '@/components/SearchInput';
import { Button } from '@/components/ui/button';
import { Stethoscope, User } from 'lucide-react';
import { clinicsData, Clinic } from '@/data/clinicsData';
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

  // Get clinic data from the imported data
  const currentClinic = clinicsData.find(clinic => clinic.id === clinicId) || {
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

  // Debug logging
  console.log('ClinicDetails - clinicId:', clinicId);
  console.log('ClinicDetails - currentClinic:', currentClinic);
  console.log('ClinicDetails - all clinic IDs:', clinicsData.map(c => c.id));

  // Service categories for filtering
  const serviceCategories: ServiceCategory[] = [
    { id: 'dermatology', name: 'Dermatology', icon: DermatologyIcon },
    { id: 'dentistry', name: 'Dental', icon: ToothIcon },
    { id: 'others', name: 'Others', icon: OthersIcon }
  ];

  // Generate service cards from clinic data
  const serviceCards: ServiceCard[] = useMemo(() => {
    const cards: ServiceCard[] = [];
    
    Object.entries(currentClinic.categories).forEach(([categoryName, services]) => {
      services.forEach(service => {
        // Generate mock time and date data
        const times = ['10:15 am - 10:30 am', '9:45 am - 10:00 am', '11:00 am - 11:15 am', '2:30 pm - 2:45 pm'];
        const dates = ['24 Aug, 2025', '15 Sep, 2026', '28 Aug, 2025', '5 Sep, 2025'];
        const icons = ['👋', '❤️', '🦷', '👁️', '🧠', '💉'];
        
        cards.push({
          id: service.id,
          name: service.name,
          category: categoryName,
          time: times[Math.floor(Math.random() * times.length)],
          date: dates[Math.floor(Math.random() * dates.length)],
          icon: icons[Math.floor(Math.random() * icons.length)]
        });
      });
    });
    
    return cards;
  }, [currentClinic]);

  // Filter service cards based on selected category
  const filteredServiceCards = useMemo(() => {
    // If no category is selected, return empty array (show empty state)
    if (!selectedCategory || selectedCategory === '') {
      return [];
    }
    
    let filtered = serviceCards.filter(card => {
      if (selectedCategory === 'dermatology') {
        return card.category.toLowerCase().includes('dermatology') || 
               card.category.toLowerCase().includes('facial') ||
               card.name.toLowerCase().includes('acne') ||
               card.name.toLowerCase().includes('skin');
      }
      if (selectedCategory === 'dentistry') {
        return card.category.toLowerCase().includes('dental') ||
               card.name.toLowerCase().includes('teeth') ||
               card.name.toLowerCase().includes('dental');
      }
      return card.category === selectedCategory;
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
    // Navigate to the service details page using the service ID
    navigate(`/service/${service.id}`);
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

  // Generate clinic-specific services for search
  const getClinicServices = () => {
    if (!selectedCategory) return [];
    
    const services: any[] = [];
    
    console.log('getClinicServices - Clinic:', currentClinic.name);
    console.log('getClinicServices - Selected Category:', selectedCategory);
    console.log('getClinicServices - Available categories:', Object.keys(currentClinic.categories));
    
    if (selectedCategory === 'dermatology') {
      // Look for dermatology-related categories
      const dermatologyCategories = ['Dermatology', 'Skin Care'];
      dermatologyCategories.forEach(categoryName => {
        if (currentClinic.categories[categoryName]) {
          currentClinic.categories[categoryName].forEach(service => {
            services.push({
              id: service.id,
              name: service.name,
              category: service.category,
              type: 'subcategory'
            });
          });
        }
      });
      
      // Also include only facial aesthetic surgery from oral & maxillofacial surgery
      if (currentClinic.categories['Oral & Maxillofacial Surgery']) {
        currentClinic.categories['Oral & Maxillofacial Surgery'].forEach(service => {
          if (service.name.toLowerCase().includes('facial aesthetic') || 
              service.name.toLowerCase().includes('oral & facial aesthetic')) {
            services.push({
              id: service.id,
              name: service.name,
              category: service.category,
              type: 'subcategory'
            });
          }
        });
      }
    } else if (selectedCategory === 'dentistry') {
      // Look for all dental-related categories
      const dentalCategories = ['Dental', 'General Dentistry', 'Orthodontics', 'Dental Implants', 'Pediatric Dentistry', 'Root Canal & Endodontics', 'Periodontal Treatment', 'Fixed & Removable Prosthodontics', 'Restorative & Cosmetic Dentistry'];
      dentalCategories.forEach(categoryName => {
        if (currentClinic.categories[categoryName]) {
          currentClinic.categories[categoryName].forEach(service => {
            services.push({
              id: service.id,
              name: service.name,
              category: service.category,
              type: 'subcategory'
            });
          });
        }
      });
      
      // Include oral & maxillofacial surgery services EXCEPT facial aesthetic surgery
      if (currentClinic.categories['Oral & Maxillofacial Surgery']) {
        currentClinic.categories['Oral & Maxillofacial Surgery'].forEach(service => {
          if (!service.name.toLowerCase().includes('facial aesthetic') && 
              !service.name.toLowerCase().includes('oral & facial aesthetic')) {
            services.push({
              id: service.id,
              name: service.name,
              category: service.category,
              type: 'subcategory'
            });
          }
        });
      }
    }
    
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
            {/* Clinic Icon */}
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
              <div className="w-8 h-8 bg-[#0C2243] rounded flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded"></div>
              </div>
            </div>
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
          {selectedCategory ? (
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