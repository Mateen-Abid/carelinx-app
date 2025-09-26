import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Stethoscope, User, Clock, Calendar } from 'lucide-react';
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
  const [selectedCategory, setSelectedCategory] = useState<string>('dermatology');

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
    return serviceCards.filter(card => {
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
  }, [serviceCards, selectedCategory]);

  // Handle service selection and navigate to service details
  const handleServiceSelect = (service: ServiceCard) => {
    // Navigate to the service details page using the service ID
    navigate(`/service/${service.id}`);
  };


  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Clinic Header Section */}
      <section className="bg-[#0C2243] text-white py-6 px-4">
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
          <div className="mb-6">
            <h2 className="text-lg font-medium text-white mb-4"><span className="text-[#00FFA2] font-medium">Step 1</span> Please choose a specialty:</h2>
            
            {/* Service Filter Buttons */}
            <div className="flex justify-center gap-2 sm:gap-3">
              {serviceCategories.map((category) => {
                const IconComponent = category.icon;
                const isOthers = category.id === 'others';
                
                return (
                  <div key={category.id} className="relative">
                    <button
                      onClick={isOthers ? undefined : () => setSelectedCategory(category.id)}
                      disabled={isOthers}
                      className={`flex flex-col items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-lg transition-all duration-200 text-xs font-medium relative ${
                        isOthers
                          ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                          : selectedCategory === category.id 
                            ? 'bg-[rgba(0,255,162,1)] text-[rgba(12,34,67,1)] shadow-sm' 
                            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <IconComponent size={16} className="shrink-0 sm:w-5 sm:h-5 mb-1" />
                      <span className="text-[8px] sm:text-[10px] leading-[1.0] sm:leading-[1.1] text-center px-0.5 break-words hyphens-auto max-w-full overflow-hidden">
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
          <h2 className="text-sm font-medium text-gray-700 mb-4"><span className="text-gray-700 font-medium">Step 2</span> Please choose a service:</h2>

          {/* Service Cards */}
          <div className="space-y-3">
            {filteredServiceCards.map((service) => (
              <div
                key={service.id}
                className="bg-white rounded-lg p-4 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleServiceSelect(service)}
              >
                <div className="flex flex-col">
                  {/* Service Name */}
                  <h3 className="font-semibold text-gray-900 text-lg mb-2">{service.name}</h3>
                  
                  {/* Time Label */}
                  <div className="text-sm text-gray-500 mb-2">Time</div>
                  
                  {/* Time and Date in separate circular containers */}
                  <div className="flex items-center gap-3">
                    {/* Time Container */}
                    <div className="bg-white text-gray-700 px-3 py-2 rounded-full text-sm font-medium flex items-center gap-2 border border-gray-200">
                      <Clock className="w-4 h-4" />
                      <span>{service.time}</span>
                    </div>
                    
                    {/* Date Container */}
                    <div className="bg-white text-gray-700 px-3 py-2 rounded-full text-sm font-medium flex items-center gap-2 border border-gray-200">
                      <Calendar className="w-4 h-4" />
                      <span>{service.date}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredServiceCards.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No services found for the selected category.</p>
            </div>
          )}
        </div>
      </section>

    </div>
  );
};

export default ClinicDetails;