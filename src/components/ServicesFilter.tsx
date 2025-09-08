import React from 'react';
import { Stethoscope, User } from 'lucide-react';

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

  const mainCategories: ServiceCategory[] = [
    { id: 'all', name: 'All', icon: Stethoscope },
    { id: 'dermatology', name: 'Dermatology', icon: User },
    { id: 'dentistry', name: 'Dental', icon: ToothIcon }
  ];



  const handleCategorySelect = (categoryId: string) => {
    // Always trigger category change to ensure proper reset
    onCategoryChange(categoryId);
  };

  const handleAllButtonClick = () => {
    // Simply clear all filters and show all data - no dropdown
    onCategoryChange('all');
  };


  const CategoryButton: React.FC<{ category: ServiceCategory; isSelected: boolean; onClick?: () => void; showChevron?: boolean }> = ({ 
    category, 
    isSelected,
    onClick,
    showChevron = false
  }) => {
    const IconComponent = category.icon;
    
    return (
      <button
        onClick={onClick || (() => handleCategorySelect(category.id))}
        className={`flex flex-col items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-lg transition-all duration-200 text-xs font-medium relative ${
          isSelected 
            ? 'bg-[rgba(0,255,162,1)] text-[rgba(12,34,67,1)] shadow-sm' 
            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
        }`}
      >
        <IconComponent size={16} className="shrink-0 sm:w-5 sm:h-5 mb-1" />
        <span className="text-[8px] sm:text-[10px] leading-[1.0] sm:leading-[1.1] text-center px-0.5 break-words hyphens-auto max-w-full overflow-hidden">
          {category.name}
        </span>
      </button>
    );
  };


  return (
    <div className="w-full relative overflow-visible">
      <div className="flex items-center gap-2 sm:gap-3 justify-center overflow-x-auto overflow-y-visible px-2 sm:px-0 pb-2">
        <div className="flex gap-2 sm:gap-3 min-w-max">
        {/* All button - no dropdown */}
        <CategoryButton
          category={mainCategories[0]}
          isSelected={selectedCategory === 'all'}
          onClick={handleAllButtonClick}
          showChevron={false}
        />

          {/* Other main category buttons */}
          {mainCategories.slice(1).map((category) => (
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