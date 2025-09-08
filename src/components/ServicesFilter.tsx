import React, { useState, useRef, useEffect } from 'react';
import { Heart, Brain, Eye, Stethoscope, Baby, Bone, Plus, Palette, ChevronDown, Activity, Scissors, UserCheck, Shield, Users2, Flower2, Microscope, Apple, Zap, ChevronRight, ArrowLeft, Smile, User } from 'lucide-react';

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'main' | string>('main');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Custom Tooth Icon Component
  const ToothIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
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
      <path d="M8 2c-2 0-4 2-4 5v4c0 3 0 6 2 8 1 1 2 1 3 1s2 0 3-1c2-2 2-5 2-8V7c0-3-2-5-4-5-1 0-2 0-2 0z"/>
      <path d="M16 2c-2 0-4 2-4 5v4c0 3 0 6 2 8 1 1 2 1 3 1s2 0 3-1c2-2 2-5 2-8V7c0-3-2-5-4-5-1 0-2 0-2 0z"/>
    </svg>
  );

  const mainCategories: ServiceCategory[] = [
    { id: 'all', name: 'All', icon: Stethoscope },
    { id: 'dentistry', name: 'Dental', icon: ToothIcon },
    { id: 'dermatology', name: 'Dermatology', icon: User }
  ];

  const allCategories: ServiceCategory[] = [
    { id: 'all', name: 'All', icon: Stethoscope },
    { 
      id: 'cardiology', 
      name: 'Cardiology', 
      icon: Heart,
      subcategories: [
        { id: 'cardiology-ecg', name: 'ECG' },
        { id: 'cardiology-echo', name: 'Echocardiogram' },
        { id: 'cardiology-stress-test', name: 'Stress Test' },
        { id: 'cardiology-holter', name: 'Holter Monitor' },
        { id: 'cardiology-angiogram', name: 'Angiogram' },
        { id: 'cardiology-ct-scan', name: 'Cardiac CT Scan' }
      ]
    },
    { 
      id: 'neurology', 
      name: 'Neurology', 
      icon: Brain,
      subcategories: [
        { id: 'neurology-mri', name: 'Brain MRI' },
        { id: 'neurology-ct-scan', name: 'Brain CT Scan' },
        { id: 'neurology-eeg', name: 'EEG' },
        { id: 'neurology-emg', name: 'EMG' },
        { id: 'neurology-lumbar-puncture', name: 'Lumbar Puncture' }
      ]
    },
    { 
      id: 'ophthalmology', 
      name: 'Ophthalmology', 
      icon: Eye,
      subcategories: [
        { id: 'ophthalmology-retinal-exam', name: 'Retinal Examination' },
        { id: 'ophthalmology-glaucoma-test', name: 'Glaucoma Test' },
        { id: 'ophthalmology-cataract-surgery', name: 'Cataract Surgery' },
        { id: 'ophthalmology-vision-test', name: 'Vision Test' },
        { id: 'ophthalmology-oct', name: 'OCT Scan' }
      ]
    },
    { 
      id: 'general-medicine', 
      name: 'General Medicine', 
      icon: Stethoscope,
      subcategories: [
        { id: 'general-checkup', name: 'General Checkup' },
        { id: 'general-blood-test', name: 'Blood Test' },
        { id: 'general-vaccination', name: 'Vaccination' },
        { id: 'general-health-screening', name: 'Health Screening' }
      ]
    },
    { 
      id: 'pediatrics', 
      name: 'Pediatrics', 
      icon: Baby,
      subcategories: [
        { id: 'pediatrics-vaccination', name: 'Child Vaccination' },
        { id: 'pediatrics-growth-check', name: 'Growth Check' },
        { id: 'pediatrics-development', name: 'Development Assessment' },
        { id: 'pediatrics-illness', name: 'Childhood Illness' }
      ]
    },
    { 
      id: 'orthopedics', 
      name: 'Orthopedics', 
      icon: Bone,
      subcategories: [
        { id: 'orthopedics-xray', name: 'X-Ray' },
        { id: 'orthopedics-mri', name: 'MRI' },
        { id: 'orthopedics-ct-scan', name: 'CT Scan' },
        { id: 'orthopedics-joint-replacement', name: 'Joint Replacement' },
        { id: 'orthopedics-fracture-care', name: 'Fracture Care' }
      ]
    },
    { 
      id: 'dermatology', 
      name: 'Dermatology', 
      icon: User,
      subcategories: [
        { id: 'dermatology-acne', name: 'Acne & Pimples' },
        { id: 'dermatology-eczema', name: 'Eczema & Dermatitis' },
        { id: 'dermatology-psoriasis', name: 'Psoriasis' },
        { id: 'dermatology-rosacea', name: 'Rosacea' },
        { id: 'dermatology-allergies', name: 'Skin Allergies' },
        { id: 'dermatology-warts', name: 'Warts & Moles' },
        { id: 'dermatology-scars', name: 'Scars & Stretch Marks' }
      ]
    },
    { 
      id: 'dentistry', 
      name: 'Dental', 
      icon: ToothIcon,
      subcategories: [
        { id: 'dentistry-cleaning', name: 'Dental Cleaning' },
        { id: 'dentistry-filling', name: 'Dental Filling' },
        { id: 'dentistry-extraction', name: 'Tooth Extraction' },
        { id: 'dentistry-whitening', name: 'Teeth Whitening' },
        { id: 'dentistry-crown', name: 'Dental Crown' },
        { id: 'dentistry-implant', name: 'Dental Implant' },
        { id: 'dentistry-orthodontics', name: 'Orthodontics' }
      ]
    }
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setCurrentView('main');
      }
    };

    const handleScroll = () => {
      if (isDropdownOpen) {
        updateDropdownPosition();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isDropdownOpen]);

  const handleCategorySelect = (categoryId: string) => {
    // Always trigger category change to ensure proper reset
    onCategoryChange(categoryId);
    setIsDropdownOpen(false);
    setCurrentView('main');
  };

  const updateDropdownPosition = () => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left
      });
    }
  };

  const handleDropdownToggle = () => {
    if (!isDropdownOpen) {
      updateDropdownPosition();
    }
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleAllButtonClick = () => {
    // Always show dropdown when All button is clicked, but if All is already selected, clear filters
    if (selectedCategory === 'all') {
      onCategoryChange('all'); // Clear all filters
    }
    handleDropdownToggle();
  };

  const handleCategoryClick = (category: ServiceCategory) => {
    if (category.subcategories && category.subcategories.length > 0) {
      setCurrentView(category.id);
    } else {
      handleCategorySelect(category.id);
    }
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
        {showChevron && (
          <ChevronDown 
            size={12} 
            className={`absolute top-1 right-1 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
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

  const SubcategoryItem: React.FC<{ subcategory: ServiceSubcategory }> = ({ subcategory }) => {
    return (
      <button
        onClick={() => handleCategorySelect(subcategory.id)}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
      >
        <span>{subcategory.name}</span>
      </button>
    );
  };

  const renderDropdownContent = () => {
    return (
      <div className="py-2">
        {allCategories.map((category) => (
          <DropdownItem
            key={category.id}
            category={category}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="w-full relative overflow-visible">
      <div className="flex items-center gap-2 sm:gap-3 justify-center overflow-x-auto overflow-y-visible px-2 sm:px-0 pb-2">
        <div className="flex gap-2 sm:gap-3 min-w-max">
        {/* All button with dropdown */}
        <div className="relative z-[60]" ref={dropdownRef}>
          <CategoryButton
            category={mainCategories[0]}
            isSelected={selectedCategory === 'all'}
            onClick={handleAllButtonClick}
            showChevron={true}
          />
          
          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div 
              className="fixed w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] max-h-80 overflow-y-auto"
              style={{
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`
              }}
            >
              {renderDropdownContent()}
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
    </div>
  );
};

export default ServicesFilter;