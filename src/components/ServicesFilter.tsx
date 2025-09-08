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
    { id: 'facial-cleaning-services', name: 'Facial Cleaning', icon: User },
    { id: 'dental', name: 'Dental', icon: ToothIcon },
    { id: 'dermatology', name: 'Dermatology', icon: User },
    { id: 'orthodontics', name: 'Orthodontics', icon: ToothIcon }
  ];

  const allCategories: ServiceCategory[] = [
    { id: 'all', name: 'All', icon: Stethoscope },
    { 
      id: 'facial-cleaning-services', 
      name: 'Facial Cleaning Services', 
      icon: User,
      subcategories: [
        { id: 'laser-sessions', name: 'Laser Sessions' },
        { id: 'plasma-sessions', name: 'Plasma Sessions' },
        { id: 'scar-treatments', name: 'Scar Treatments' },
        { id: 'fat-reduction', name: 'Fat Reduction' },
        { id: 'cosmetic-injections', name: 'Cosmetic Injections' },
        { id: 'dark-circles-lightening', name: 'Dark Circles Lightening' },
        { id: 'fractional-laser-sessions', name: 'Fractional Laser Sessions' },
        { id: 'chemical-peeling-sessions', name: 'Chemical Peeling Sessions' }
      ]
    },
    { 
      id: 'dental', 
      name: 'Dental', 
      icon: ToothIcon,
      subcategories: [
        { id: 'teeth-whitening', name: 'Teeth Whitening' },
        { id: 'teeth-cleaning', name: 'Teeth Cleaning' },
        { id: 'polishing-scaling', name: 'Polishing & Scaling' },
        { id: 'dental-fillings', name: 'Dental Fillings' },
        { id: 'dentures', name: 'Dentures' },
        { id: 'orthodontics-teeth-jaw', name: 'Orthodontics (Teeth & Jaw Alignment)' },
        { id: 'gum-surgery-dental-implants', name: 'Gum Surgery & Dental Implants' },
        { id: 'crowns-dental-prosthetics', name: 'Crowns & Dental Prosthetics' },
        { id: 'root-canal-endodontics', name: 'Root Canal & Endodontics' },
        { id: 'fillings-conservative-dentistry', name: 'Fillings & Conservative Dentistry' },
        { id: 'oral-health-care-department', name: 'Oral Health Care Department' },
        { id: 'pediatric-dentistry', name: 'Pediatric Dentistry' },
        { id: 'cosmetic-veneers', name: 'Cosmetic Veneers (Veneers)' },
        { id: 'dental-prosthetics-restorations', name: 'Dental Prosthetics / Tooth Restorations' },
        { id: 'oral-dental-surgery', name: 'Oral and Dental Surgery' },
        { id: 'intraoral-camera-service', name: 'Intraoral Camera Service' },
        { id: 'laser-teeth-whitening', name: 'Laser Teeth Whitening' },
        { id: 'root-canal-treatment', name: 'Root Canal Treatment' },
        { id: 'pediatric-dental-treatment', name: 'Pediatric Dental Treatment' },
        { id: 'gum-treatment-periodontal-care', name: 'Gum Treatment / Periodontal Care' },
        { id: 'hollywood-smile', name: 'Hollywood Smile' },
        { id: 'cosmetic-fillings', name: 'Cosmetic Fillings' }
      ]
    },
    { 
      id: 'dermatology', 
      name: 'Dermatology', 
      icon: User,
      subcategories: [
        { id: 'laser-hair-removal', name: 'Laser Hair Removal' },
        { id: 'filler-injections', name: 'Filler Injections' },
        { id: 'botox-injections', name: 'Botox Injections' },
        { id: 'carbon-laser', name: 'Carbon Laser' },
        { id: 'cold-peeling', name: 'Cold Peeling' },
        { id: 'bleaching', name: 'Bleaching' },
        { id: 'skin-rejuvenation', name: 'Skin Rejuvenation' },
        { id: 'scar-stretch-marks-removal', name: 'Scar & Stretch Marks Removal' },
        { id: 'skin-tightening-wrinkle-removal', name: 'Skin Tightening & Wrinkle Removal' }
      ]
    },
    { 
      id: 'orthodontics', 
      name: 'Orthodontics', 
      icon: ToothIcon,
      subcategories: [
        { id: 'clear-aligners', name: 'Clear Aligners' },
        { id: 'metal-braces', name: 'Metal Braces' },
        { id: 'surgical-orthodontics', name: 'Surgical Orthodontics' },
        { id: 'auxiliary-orthodontics', name: 'Auxiliary Orthodontics' },
        { id: 'pediatric-orthodontics', name: 'Pediatric Orthodontics' },
        { id: 'temporary-anchorage-devices', name: 'Temporary Anchorage Devices (TADs)' }
      ]
    },
    { 
      id: 'dental-implants', 
      name: 'Dental Implants', 
      icon: ToothIcon,
      subcategories: [
        { id: 'bone-grafting', name: 'Bone Grafting' },
        { id: 'sinus-lifting', name: 'Sinus Lifting' },
        { id: 'biohorizons-dental-implants', name: 'Biohorizons Dental Implants (USA)' },
        { id: 'peri-implantitis-treatment', name: 'Peri-implantitis Treatment' },
        { id: 'dental-implant-removal', name: 'Dental Implant Removal' },
        { id: 'straumann-dental-implants', name: 'Straumann Dental Implants (Switzerland)' }
      ]
    },
    { 
      id: 'fixed-removable-prosthodontics', 
      name: 'Fixed & Removable Prosthodontics', 
      icon: ToothIcon,
      subcategories: [
        { id: 'complete-partial-removable-dentures', name: 'Complete & Partial Removable Dentures' },
        { id: 'implant-supported-fixed-prosthesis', name: 'Implant-Supported Fixed Prosthesis' },
        { id: 'implant-supported-removable-prosthesis', name: 'Implant-Supported Removable Prosthesis' },
        { id: 'full-partial-crowns', name: 'Full & Partial Crowns' },
        { id: 'post-core-restorations', name: 'Post and Core for Restorations' },
        { id: 'dental-bridges', name: 'Dental Bridges' },
        { id: 'in-office-teeth-whitening', name: 'In-Office Teeth Whitening' },
        { id: 'at-home-teeth-whitening', name: 'At-Home Teeth Whitening' },
        { id: 'porcelain-veneers', name: 'Porcelain Veneers' }
      ]
    },
    { 
      id: 'restorative-cosmetic-dentistry', 
      name: 'Restorative & Cosmetic Dentistry', 
      icon: ToothIcon,
      subcategories: [
        { id: 'cosmetic-fillings-restorative', name: 'Cosmetic Fillings' },
        { id: 'tooth-reconstruction', name: 'Tooth Reconstruction' },
        { id: 'dental-crowns-cosmetic', name: 'Dental Crowns' },
        { id: 'aesthetic-veneers', name: 'Aesthetic Veneers' },
        { id: 'in-office-whitening-cosmetic', name: 'In-Office Whitening' },
        { id: 'take-home-whitening', name: 'Take-Home Whitening' },
        { id: 'stain-removal-no-preparation', name: 'Stain Removal Without Tooth Preparation' }
      ]
    },
    { 
      id: 'periodontal-treatment', 
      name: 'Periodontal Treatment', 
      icon: ToothIcon,
      subcategories: [
        { id: 'gum-disease-periodontal-pocket-treatment', name: 'Gum Disease & Periodontal Pocket Treatment' },
        { id: 'scaling-stain-removal', name: 'Scaling and Stain Removal' },
        { id: 'surgical-gummy-smile-correction', name: 'Surgical Gummy Smile Correction' },
        { id: 'gum-contouring-depigmentation-laser', name: 'Gum Contouring and Depigmentation with Laser' },
        { id: 'tooth-splinting', name: 'Tooth Splinting' }
      ]
    },
    { 
      id: 'oral-maxillofacial-surgery', 
      name: 'Oral & Maxillofacial Surgery', 
      icon: ToothIcon,
      subcategories: [
        { id: 'simple-surgical-tooth-extractions', name: 'Simple & Surgical Tooth Extractions' },
        { id: 'orthognathic-jaw-surgery', name: 'Orthognathic (Jaw) Surgery' },
        { id: 'removal-cysts-lipomas', name: 'Removal of Cysts (Lipomas/Fatty Masses)' },
        { id: 'correction-congenital-malformations', name: 'Correction of Congenital Malformations' },
        { id: 'salivary-gland-tumor-treatment', name: 'Salivary Gland Tumor Treatment' },
        { id: 'oral-facial-aesthetic-surgery', name: 'Oral & Facial Aesthetic Surgery' }
      ]
    },
    { 
      id: 'general-dentistry', 
      name: 'General Dentistry', 
      icon: ToothIcon,
      subcategories: [
        { id: 'dental-checkup-diagnosis', name: 'Dental Check-up & Diagnosis' },
        { id: 'conservative-dental-treatment', name: 'Conservative Dental Treatment' },
        { id: 'emergency-dental-care', name: 'Emergency Dental Care' },
        { id: 'dental-cleaning-general', name: 'Dental Cleaning' },
        { id: 'root-canal-therapy', name: 'Root Canal Therapy' },
        { id: 'tooth-extraction', name: 'Tooth Extraction' }
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