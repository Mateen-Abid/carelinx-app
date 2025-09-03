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
    { id: 'general-medicine', name: 'General Medicine', icon: Stethoscope },
    { id: 'pediatrics', name: 'Pediatrics', icon: Baby },
    { id: 'orthopedics', name: 'Orthopedics', icon: Bone },
    { id: 'emergency-care', name: 'Emergency Care', icon: Plus },
    { id: 'dermatology', name: 'Dermatology', icon: Palette }
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
        className={`flex items-center gap-2 justify-center px-4 py-3 rounded-full transition-colors min-h-[44px] ${
          isSelected 
            ? 'bg-[rgba(0,255,162,1)] text-black font-medium' 
            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
        }`}
      >
        <IconComponent size={18} className="shrink-0" />
        <span className="text-sm whitespace-nowrap">
          {category.name}
        </span>
      </button>
    );
  };

  return (
    <div className="w-full">
      <div className="flex w-full items-center gap-3 flex-wrap justify-center">
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