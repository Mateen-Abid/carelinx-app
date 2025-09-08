import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Stethoscope, User, Clock, Calendar } from 'lucide-react';
import { clinicsData, Clinic } from '@/data/clinicsData';

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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Get clinic data from the imported data
  const currentClinic = clinicsData.find(clinic => clinic.id === clinicId) || {
    id: 'unknown',
    name: 'Medical Center',
    address: 'Location not specified',
    type: 'Medical Clinic',
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
    { id: 'all', name: 'All', icon: Stethoscope },
    { id: 'dermatology', name: 'Dermatology', icon: User },
    { id: 'dentistry', name: 'Dental', icon: ToothIcon }
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
    if (selectedCategory === 'all') {
      return serviceCards;
    }
    
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
          <div className="flex items-center gap-4 mb-4">
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
        </div>
      </section>

      {/* Services Section */}
      <section className="py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Services</h2>
          
          {/* Service Filter Buttons */}
          <div className="flex gap-3 mb-6">
            {serviceCategories.map((category) => {
              const IconComponent = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-[#0C2243] text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <IconComponent size={16} />
                  {category.name}
                </button>
              );
            })}
          </div>

          {/* Service Cards */}
          <div className="space-y-3">
            {filteredServiceCards.map((service) => (
              <div
                key={service.id}
                className="bg-white rounded-lg p-4 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleServiceSelect(service)}
              >
                <div className="flex items-center gap-4">
                  {/* Service Icon */}
                  <div className="w-12 h-12 bg-[#00FFA2] rounded-full flex items-center justify-center text-2xl">
                    {service.icon}
                  </div>
                  
                  {/* Service Details */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg">{service.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                        {service.category}
                      </span>
                    </div>
                    
                    {/* Time and Date */}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{service.time}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{service.date}</span>
                      </div>
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