import React from 'react';
import { Stethoscope } from 'lucide-react'; // removed User since not needed anymore
import Image5 from '../assets/image 5.svg'; // adjust path based on your folder structure
import { clinicsData } from '@/data/clinicsData';

interface ServiceSubcategory {
  id: string;
  name: string;
}

interface ServiceCategory {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  subcategories?: ServiceSubcategory[];
}

interface ServicesFilterProps {
  onCategoryChange: (categoryId: string) => void;
  selectedCategory: string;
}

const ServicesFilter: React.FC<ServicesFilterProps> = ({ onCategoryChange, selectedCategory }) => {

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
      className={className}
    >
      <path 
        d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M14 2V8H20" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M16 13H8" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M16 17H8" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M10 9H8" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );

  // Get subcategories from clinic data
  const getSubcategories = (categoryId: string) => {
    const categoryName = categoryId === 'dermatology' ? 'Dermatology' : 'Dental';
    const subcategories: ServiceSubcategory[] = [];
    
    clinicsData.forEach(clinic => {
      if (clinic.categories[categoryName]) {
        clinic.categories[categoryName].forEach(service => {
          if (!subcategories.find(sub => sub.id === service.id)) {
            subcategories.push({
              id: service.id,
              name: service.name
            });
          }
        });
      }
    });
    
    return subcategories;
  };

  const mainCategories: ServiceCategory[] = [
    { id: 'dermatology', name: 'Dermatology', icon: DermatologyIcon },
    { id: 'dentistry', name: 'Dental', icon: ToothIcon },
    { id: 'others', name: 'Others', icon: OthersIcon }
  ];

  const handleCategorySelect = (categoryId: string) => {
    onCategoryChange(categoryId);
  };


  const CategoryButton: React.FC<{ category: ServiceCategory; isSelected: boolean; onClick?: () => void; showChevron?: boolean }> = ({ 
    category, 
    isSelected,
    onClick,
    showChevron = false
  }) => {
    const IconComponent = category.icon;
    const isOthers = category.id === 'others';
    
    return (
      <div className="relative">
        <button
          onClick={isOthers ? undefined : (onClick || (() => handleCategorySelect(category.id)))}
          disabled={isOthers}
          className={`flex flex-col items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-lg transition-all duration-200 text-xs font-medium relative ${
            isOthers
              ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
              : isSelected 
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
  };

  return (
    <div className="w-full relative overflow-hidden">
      <div className="flex items-center gap-2 sm:gap-3 justify-center overflow-x-auto overflow-y-hidden px-2 sm:px-0 pb-2">
        <div className="flex gap-2 sm:gap-3 min-w-max">
          {/* Main category buttons */}
          {mainCategories.map((category) => (
            <CategoryButton
              key={category.id}
              category={category}
              isSelected={selectedCategory === category.id}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ServicesFilter;
