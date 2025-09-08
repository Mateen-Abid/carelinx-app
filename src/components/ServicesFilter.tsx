import React, { useState, useRef, useEffect } from 'react';
import { Heart, Brain, Eye, Stethoscope, Baby, Bone, Plus, Palette, ChevronDown, Activity, Scissors, UserCheck, Shield, Users2, Flower2, Microscope, Apple, Zap, ChevronRight, ArrowLeft } from 'lucide-react';

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

  const mainCategories: ServiceCategory[] = [
    { id: 'all', name: 'All', icon: Stethoscope },
    { id: 'cardiology', name: 'Cardiology', icon: Heart },
    { id: 'neurology', name: 'Neurology', icon: Brain },
    { id: 'ophthalmology', name: 'Ophthalmology', icon: Eye }
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
      icon: Palette,
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
    { id: 'emergency-care', name: 'Emergency Care', icon: Plus },
    { id: 'preventive-care', name: 'Preventive Care', icon: Shield },
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
        setCurrentView('main');
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
    setCurrentView('main');
  };

  const updateDropdownPosition = () => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX
      });
    }
  };

  const handleDropdownToggle = () => {
    if (!isDropdownOpen) {
      updateDropdownPosition();
    }
    setIsDropdownOpen(!isDropdownOpen);
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
            ? 'bg-[#1E40AF] text-white shadow-sm' 
            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
        }`}
      >
        <IconComponent size={16} className="shrink-0 sm:w-5 sm:h-5 mb-1" />
        <span className="text-[10px] sm:text-xs leading-tight text-center px-1">
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
            onClick={handleDropdownToggle}
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