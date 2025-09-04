import React from 'react';
import { Heart, Brain, Eye, Stethoscope, Baby, Bone, Plus, Palette } from 'lucide-react';

interface ServiceCategory {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
}

interface ServicesFilterProps {
  onCategoryChange: (categoryId: string) => void;
  selectedCategory: string;
}

const ServicesFilter: React.FC<ServicesFilterProps> = ({ onCategoryChange, selectedCategory }) => {
  const categories: ServiceCategory[] = [
    { id: 'all', name: 'All', icon: Stethoscope },
    { id: 'cardiology', name: 'Cardiology', icon: Heart },
    { id: 'neurology', name: 'Neurology', icon: Brain },
    { id: 'ophthalmology', name: 'Ophthalmology', icon: Eye },
    { id: 'general-medicine', name: 'General Medicine', icon: Stethoscope }
  ];

  const handleCategorySelect = (categoryId: string) => {
    onCategoryChange(categoryId);
  };

  const CategoryPill: React.FC<{ category: ServiceCategory; isSelected: boolean }> = ({ 
    category, 
    isSelected 
  }) => {
    const IconComponent = category.icon;
    
    return (
      <button
        onClick={() => handleCategorySelect(category.id)}
        className={`flex items-center gap-1 sm:gap-2 justify-center px-3 sm:px-4 py-2 sm:py-3 rounded-full transition-colors min-h-[36px] sm:min-h-[44px] ${
          isSelected 
            ? 'bg-[rgba(0,255,162,1)] text-black font-medium' 
            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
        }`}
      >
        <IconComponent size={16} className="shrink-0 sm:w-[18px] sm:h-[18px]" />
        <span className="text-xs sm:text-sm whitespace-nowrap">
          {category.name}
        </span>
      </button>
    );
  };

  return (
    <div className="w-full">
      <div className="flex w-full items-center gap-2 sm:gap-3 flex-wrap justify-center">
        {categories.map((category) => (
          <CategoryPill
            key={category.id}
            category={category}
            isSelected={selectedCategory === category.id}
          />
        ))}
      </div>
    </div>
  );
};

export default ServicesFilter;