import React, { useState, useRef, useEffect } from 'react';
import { Heart, Brain, Eye, Stethoscope, Baby, Bone, Plus, Palette, ChevronDown, Activity, Scissors, UserCheck, Shield, Users2, Flower2, Microscope, Apple, Zap } from 'lucide-react';

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const mainCategories: ServiceCategory[] = [
    { id: 'all', name: 'All', icon: Stethoscope },
    { id: 'cardiology', name: 'Cardiology', icon: Heart },
    { id: 'neurology', name: 'Neurology', icon: Brain },
    { id: 'ophthalmology', name: 'Ophthalmology', icon: Eye }
  ];

  const allCategories: ServiceCategory[] = [
    { id: 'all', name: 'All', icon: Stethoscope },
    { id: 'cardiology', name: 'Cardiology', icon: Heart },
    { id: 'neurology', name: 'Neurology', icon: Brain },
    { id: 'ophthalmology', name: 'Ophthalmology', icon: Eye },
    { id: 'general-medicine', name: 'General Medicine', icon: Stethoscope },
    { id: 'pediatrics', name: 'Pediatrics', icon: Baby },
    { id: 'orthopedics', name: 'Orthopedics', icon: Bone },
    { id: 'emergency-care', name: 'Emergency Care', icon: Plus },
    { id: 'preventive-care', name: 'Preventive Care', icon: Shield },
    { id: 'dermatology', name: 'Dermatology', icon: Palette },
    { id: 'dentistry', name: 'Dentistry', icon: UserCheck },
    { id: 'gynecology', name: 'Gynecology', icon: Flower2 },
    { id: 'pathology', name: 'Pathology', icon: Microscope },
    { id: 'nutrition', name: 'Nutrition', icon: Apple },
    { id: 'psychiatry', name: 'Psychiatry', icon: Users2 },
    { id: 'pulmonology', name: 'Pulmonology', icon: Activity }
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleCategorySelect = (categoryId: string) => {
    onCategoryChange(categoryId);
    setIsDropdownOpen(false);
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
        className={`flex items-center gap-2 justify-center px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
          isSelected 
            ? 'bg-[#1E40AF] text-white shadow-sm' 
            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
        }`}
      >
        <IconComponent size={16} className="shrink-0" />
        <span className="whitespace-nowrap">
          {category.name}
        </span>
        {showChevron && (
          <ChevronDown 
            size={14} 
            className={`shrink-0 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
          />
        )}
      </button>
    );
  };

  const DropdownItem: React.FC<{ category: ServiceCategory }> = ({ category }) => {
    const IconComponent = category.icon;
    
    return (
      <button
        onClick={() => handleCategorySelect(category.id)}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
      >
        <IconComponent size={16} className="shrink-0 text-gray-500" />
        <span>{category.name}</span>
      </button>
    );
  };

  return (
    <div className="w-full relative">
      <div className="flex items-center gap-2 justify-center flex-wrap overflow-visible">
        {/* All button with dropdown */}
        <div className="relative z-50" ref={dropdownRef}>
          <CategoryButton
            category={mainCategories[0]}
            isSelected={selectedCategory === 'all'}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            showChevron={true}
          />
          
          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] max-h-80 overflow-y-auto">
              <div className="py-2">
                {allCategories.map((category) => (
                  <DropdownItem
                    key={category.id}
                    category={category}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

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
  );
};

export default ServicesFilter;