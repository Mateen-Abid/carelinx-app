import React, { useState, useRef, useEffect } from 'react';

interface SearchOption {
  id: string;
  name: string;
  category: string;
  type: 'category' | 'subcategory';
}

interface SearchInputProps {
  placeholder?: string;
  onSearch?: (value: string) => void;
  onOptionSelect?: (option: SearchOption) => void;
  selectedCategory?: string;
}

const SearchInput: React.FC<SearchInputProps> = ({ 
  placeholder = "Search by service, clinic, or doctor's name",
  onSearch,
  onOptionSelect,
  selectedCategory = 'all'
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [filteredOptions, setFilteredOptions] = useState<SearchOption[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<'categories' | 'services'>('categories');
  const searchRef = useRef<HTMLDivElement>(null);

  const searchOptions: SearchOption[] = [
    // Main Categories
    { id: 'facial-cleaning-services', name: 'Facial Cleaning Services', category: 'Medical Specialty', type: 'category' },
    { id: 'dental', name: 'Dental', category: 'Medical Specialty', type: 'category' },
    { id: 'dermatology', name: 'Dermatology', category: 'Medical Specialty', type: 'category' },
    { id: 'orthodontics', name: 'Orthodontics', category: 'Medical Specialty', type: 'category' },
    { id: 'dental-implants', name: 'Dental Implants', category: 'Medical Specialty', type: 'category' },
    { id: 'pediatric-dentistry', name: 'Pediatric Dentistry', category: 'Medical Specialty', type: 'category' },
    { id: 'fixed-removable-prosthodontics', name: 'Fixed & Removable Prosthodontics', category: 'Medical Specialty', type: 'category' },
    { id: 'restorative-cosmetic-dentistry', name: 'Restorative & Cosmetic Dentistry', category: 'Medical Specialty', type: 'category' },
    { id: 'root-canal-endodontics', name: 'Root Canal & Endodontics', category: 'Medical Specialty', type: 'category' },
    { id: 'periodontal-treatment', name: 'Periodontal Treatment', category: 'Medical Specialty', type: 'category' },
    { id: 'oral-maxillofacial-surgery', name: 'Oral & Maxillofacial Surgery', category: 'Medical Specialty', type: 'category' },
    { id: 'general-dentistry', name: 'General Dentistry', category: 'Medical Specialty', type: 'category' },

    // Facial Cleaning Services Subcategories
    { id: 'laser-sessions', name: 'Laser Sessions', category: 'Facial Cleaning Services', type: 'subcategory' },
    { id: 'plasma-sessions', name: 'Plasma Sessions', category: 'Facial Cleaning Services', type: 'subcategory' },
    { id: 'scar-treatments', name: 'Scar Treatments', category: 'Facial Cleaning Services', type: 'subcategory' },
    { id: 'fat-reduction', name: 'Fat Reduction', category: 'Facial Cleaning Services', type: 'subcategory' },
    { id: 'cosmetic-injections', name: 'Cosmetic Injections', category: 'Facial Cleaning Services', type: 'subcategory' },
    { id: 'dark-circles-lightening', name: 'Dark Circles Lightening', category: 'Facial Cleaning Services', type: 'subcategory' },
    { id: 'fractional-laser-sessions', name: 'Fractional Laser Sessions', category: 'Facial Cleaning Services', type: 'subcategory' },
    { id: 'chemical-peeling-sessions', name: 'Chemical Peeling Sessions', category: 'Facial Cleaning Services', type: 'subcategory' },

    // Dental Subcategories (Panorama Medical Clinic)
    { id: 'teeth-whitening', name: 'Teeth Whitening', category: 'Dental', type: 'subcategory' },
    { id: 'teeth-cleaning', name: 'Teeth Cleaning', category: 'Dental', type: 'subcategory' },
    { id: 'polishing-scaling', name: 'Polishing & Scaling', category: 'Dental', type: 'subcategory' },
    { id: 'dental-fillings', name: 'Dental Fillings', category: 'Dental', type: 'subcategory' },
    { id: 'dentures', name: 'Dentures', category: 'Dental', type: 'subcategory' },
    { id: 'orthodontics-teeth-jaw', name: 'Orthodontics (Teeth & Jaw Alignment)', category: 'Dental', type: 'subcategory' },

    // Esan Clinic Dental Services
    { id: 'gum-surgery-dental-implants', name: 'Gum Surgery & Dental Implants', category: 'Dental', type: 'subcategory' },
    { id: 'crowns-dental-prosthetics', name: 'Crowns & Dental Prosthetics', category: 'Dental', type: 'subcategory' },
    { id: 'root-canal-endodontics-esan', name: 'Root Canal & Endodontics', category: 'Dental', type: 'subcategory' },
    { id: 'fillings-conservative-dentistry', name: 'Fillings & Conservative Dentistry', category: 'Dental', type: 'subcategory' },
    { id: 'oral-health-care-department', name: 'Oral Health Care Department', category: 'Dental', type: 'subcategory' },
    { id: 'pediatric-dentistry-esan', name: 'Pediatric Dentistry', category: 'Dental', type: 'subcategory' },
    { id: 'cosmetic-veneers', name: 'Cosmetic Veneers (Veneers)', category: 'Dental', type: 'subcategory' },

    // Union Medical Complex Dental Services
    { id: 'dental-prosthetics-restorations', name: 'Dental Prosthetics / Tooth Restorations', category: 'Dental', type: 'subcategory' },
    { id: 'oral-dental-surgery', name: 'Oral and Dental Surgery', category: 'Dental', type: 'subcategory' },
    { id: 'intraoral-camera-service', name: 'Intraoral Camera Service', category: 'Dental', type: 'subcategory' },
    { id: 'laser-teeth-whitening', name: 'Laser Teeth Whitening', category: 'Dental', type: 'subcategory' },
    { id: 'root-canal-treatment', name: 'Root Canal Treatment', category: 'Dental', type: 'subcategory' },
    { id: 'pediatric-dental-treatment', name: 'Pediatric Dental Treatment', category: 'Dental', type: 'subcategory' },
    { id: 'gum-treatment-periodontal-care', name: 'Gum Treatment / Periodontal Care', category: 'Dental', type: 'subcategory' },
    { id: 'hollywood-smile', name: 'Hollywood Smile', category: 'Dental', type: 'subcategory' },
    { id: 'cosmetic-fillings', name: 'Cosmetic Fillings', category: 'Dental', type: 'subcategory' },

    // Dermatology Subcategories (Esan Clinic)
    { id: 'laser-hair-removal', name: 'Laser Hair Removal', category: 'Dermatology', type: 'subcategory' },
    { id: 'filler-injections', name: 'Filler Injections', category: 'Dermatology', type: 'subcategory' },
    { id: 'botox-injections', name: 'Botox Injections', category: 'Dermatology', type: 'subcategory' },
    { id: 'carbon-laser', name: 'Carbon Laser', category: 'Dermatology', type: 'subcategory' },
    { id: 'cold-peeling', name: 'Cold Peeling', category: 'Dermatology', type: 'subcategory' },
    { id: 'bleaching', name: 'Bleaching', category: 'Dermatology', type: 'subcategory' },
    { id: 'skin-rejuvenation', name: 'Skin Rejuvenation', category: 'Dermatology', type: 'subcategory' },
    { id: 'scar-stretch-marks-removal', name: 'Scar & Stretch Marks Removal', category: 'Dermatology', type: 'subcategory' },
    { id: 'skin-tightening-wrinkle-removal', name: 'Skin Tightening & Wrinkle Removal', category: 'Dermatology', type: 'subcategory' },

    // Orthodontics Subcategories (Oracare Clinic)
    { id: 'clear-aligners', name: 'Clear Aligners', category: 'Orthodontics', type: 'subcategory' },
    { id: 'metal-braces', name: 'Metal Braces', category: 'Orthodontics', type: 'subcategory' },
    { id: 'surgical-orthodontics', name: 'Surgical Orthodontics', category: 'Orthodontics', type: 'subcategory' },
    { id: 'auxiliary-orthodontics', name: 'Auxiliary Orthodontics', category: 'Orthodontics', type: 'subcategory' },
    { id: 'pediatric-orthodontics', name: 'Pediatric Orthodontics', category: 'Orthodontics', type: 'subcategory' },
    { id: 'temporary-anchorage-devices', name: 'Temporary Anchorage Devices (TADs)', category: 'Orthodontics', type: 'subcategory' },

    // Dental Implants Subcategories (Oracare Clinic)
    { id: 'bone-grafting', name: 'Bone Grafting', category: 'Dental Implants', type: 'subcategory' },
    { id: 'sinus-lifting', name: 'Sinus Lifting', category: 'Dental Implants', type: 'subcategory' },
    { id: 'biohorizons-dental-implants', name: 'Biohorizons Dental Implants (USA)', category: 'Dental Implants', type: 'subcategory' },
    { id: 'peri-implantitis-treatment', name: 'Peri-implantitis Treatment', category: 'Dental Implants', type: 'subcategory' },
    { id: 'dental-implant-removal', name: 'Dental Implant Removal', category: 'Dental Implants', type: 'subcategory' },
    { id: 'straumann-dental-implants', name: 'Straumann Dental Implants (Switzerland)', category: 'Dental Implants', type: 'subcategory' },

    // Pediatric Dentistry Subcategories (Oracare Clinic)
    { id: 'preventive-care', name: 'Preventive Care', category: 'Pediatric Dentistry', type: 'subcategory' },
    { id: 'crowns-damaged-teeth', name: 'Crowns for Damaged Teeth', category: 'Pediatric Dentistry', type: 'subcategory' },
    { id: 'emergency-trauma-management', name: 'Emergency Trauma Management', category: 'Pediatric Dentistry', type: 'subcategory' },
    { id: 'early-caries-management', name: 'Early Caries Management', category: 'Pediatric Dentistry', type: 'subcategory' },
    { id: 'fillings-pulp-therapy', name: 'Fillings & Pulp Therapy', category: 'Pediatric Dentistry', type: 'subcategory' },
    { id: 'care-special-needs-children', name: 'Care for Special Needs Children', category: 'Pediatric Dentistry', type: 'subcategory' },
    { id: 'jaw-growth-monitoring', name: 'Jaw Growth Monitoring', category: 'Pediatric Dentistry', type: 'subcategory' },
    { id: 'dental-examination-assessment', name: 'Dental Examination & Assessment', category: 'Pediatric Dentistry', type: 'subcategory' },

    // Fixed & Removable Prosthodontics Subcategories (Oracare Clinic)
    { id: 'complete-partial-removable-dentures', name: 'Complete & Partial Removable Dentures', category: 'Fixed & Removable Prosthodontics', type: 'subcategory' },
    { id: 'implant-supported-fixed-prosthesis', name: 'Implant-Supported Fixed Prosthesis', category: 'Fixed & Removable Prosthodontics', type: 'subcategory' },
    { id: 'implant-supported-removable-prosthesis', name: 'Implant-Supported Removable Prosthesis', category: 'Fixed & Removable Prosthodontics', type: 'subcategory' },
    { id: 'full-partial-crowns', name: 'Full & Partial Crowns', category: 'Fixed & Removable Prosthodontics', type: 'subcategory' },
    { id: 'post-core-restorations', name: 'Post and Core for Restorations', category: 'Fixed & Removable Prosthodontics', type: 'subcategory' },
    { id: 'dental-bridges', name: 'Dental Bridges', category: 'Fixed & Removable Prosthodontics', type: 'subcategory' },
    { id: 'in-office-teeth-whitening', name: 'In-Office Teeth Whitening', category: 'Fixed & Removable Prosthodontics', type: 'subcategory' },
    { id: 'at-home-teeth-whitening', name: 'At-Home Teeth Whitening', category: 'Fixed & Removable Prosthodontics', type: 'subcategory' },
    { id: 'porcelain-veneers', name: 'Porcelain Veneers', category: 'Fixed & Removable Prosthodontics', type: 'subcategory' },

    // Restorative & Cosmetic Dentistry Subcategories (Oracare Clinic)
    { id: 'cosmetic-fillings-restorative', name: 'Cosmetic Fillings', category: 'Restorative & Cosmetic Dentistry', type: 'subcategory' },
    { id: 'tooth-reconstruction', name: 'Tooth Reconstruction', category: 'Restorative & Cosmetic Dentistry', type: 'subcategory' },
    { id: 'dental-crowns-cosmetic', name: 'Dental Crowns', category: 'Restorative & Cosmetic Dentistry', type: 'subcategory' },
    { id: 'aesthetic-veneers', name: 'Aesthetic Veneers', category: 'Restorative & Cosmetic Dentistry', type: 'subcategory' },
    { id: 'in-office-whitening-cosmetic', name: 'In-Office Whitening', category: 'Restorative & Cosmetic Dentistry', type: 'subcategory' },
    { id: 'take-home-whitening', name: 'Take-Home Whitening', category: 'Restorative & Cosmetic Dentistry', type: 'subcategory' },
    { id: 'stain-removal-no-preparation', name: 'Stain Removal Without Tooth Preparation', category: 'Restorative & Cosmetic Dentistry', type: 'subcategory' },

    // Root Canal & Endodontics Subcategories (Oracare Clinic)
    { id: 'root-canal-treatment-all-teeth', name: 'Root Canal Treatment for All Teeth', category: 'Root Canal & Endodontics', type: 'subcategory' },
    { id: 'emergency-root-canal-treatment', name: 'Emergency Root Canal Treatment', category: 'Root Canal & Endodontics', type: 'subcategory' },
    { id: 'retreatment-failed-root-canals', name: 'Retreatment of Failed Root Canals', category: 'Root Canal & Endodontics', type: 'subcategory' },
    { id: 'removal-intracanal-posts', name: 'Removal of Intracanal Posts', category: 'Root Canal & Endodontics', type: 'subcategory' },
    { id: 'abscess-treatment', name: 'Abscess Treatment', category: 'Root Canal & Endodontics', type: 'subcategory' },

    // Periodontal Treatment Subcategories (Oracare Clinic)
    { id: 'gum-disease-periodontal-pocket-treatment', name: 'Gum Disease & Periodontal Pocket Treatment', category: 'Periodontal Treatment', type: 'subcategory' },
    { id: 'scaling-stain-removal', name: 'Scaling and Stain Removal', category: 'Periodontal Treatment', type: 'subcategory' },
    { id: 'surgical-gummy-smile-correction', name: 'Surgical Gummy Smile Correction', category: 'Periodontal Treatment', type: 'subcategory' },
    { id: 'gum-contouring-depigmentation-laser', name: 'Gum Contouring and Depigmentation with Laser', category: 'Periodontal Treatment', type: 'subcategory' },
    { id: 'tooth-splinting', name: 'Tooth Splinting', category: 'Periodontal Treatment', type: 'subcategory' },

    // Oral & Maxillofacial Surgery Subcategories (Oracare Clinic)
    { id: 'simple-surgical-tooth-extractions', name: 'Simple & Surgical Tooth Extractions', category: 'Oral & Maxillofacial Surgery', type: 'subcategory' },
    { id: 'orthognathic-jaw-surgery', name: 'Orthognathic (Jaw) Surgery', category: 'Oral & Maxillofacial Surgery', type: 'subcategory' },
    { id: 'removal-cysts-lipomas', name: 'Removal of Cysts (Lipomas/Fatty Masses)', category: 'Oral & Maxillofacial Surgery', type: 'subcategory' },
    { id: 'correction-congenital-malformations', name: 'Correction of Congenital Malformations', category: 'Oral & Maxillofacial Surgery', type: 'subcategory' },
    { id: 'salivary-gland-tumor-treatment', name: 'Salivary Gland Tumor Treatment', category: 'Oral & Maxillofacial Surgery', type: 'subcategory' },
    { id: 'oral-facial-aesthetic-surgery', name: 'Oral & Facial Aesthetic Surgery', category: 'Oral & Maxillofacial Surgery', type: 'subcategory' },

    // General Dentistry Subcategories (Oracare Clinic)
    { id: 'dental-checkup-diagnosis', name: 'Dental Check-up & Diagnosis', category: 'General Dentistry', type: 'subcategory' },
    { id: 'conservative-dental-treatment', name: 'Conservative Dental Treatment', category: 'General Dentistry', type: 'subcategory' },
    { id: 'emergency-dental-care', name: 'Emergency Dental Care', category: 'General Dentistry', type: 'subcategory' },
    { id: 'dental-cleaning-general', name: 'Dental Cleaning', category: 'General Dentistry', type: 'subcategory' },
    { id: 'root-canal-therapy', name: 'Root Canal Therapy', category: 'General Dentistry', type: 'subcategory' },
    { id: 'tooth-extraction', name: 'Tooth Extraction', category: 'General Dentistry', type: 'subcategory' }
  ];

  const getCategorySubcategories = () => {
    if (selectedCategory === 'all') {
      return searchOptions.filter(option => option.type === 'subcategory');
    }
    return searchOptions.filter(option => 
      option.type === 'subcategory' && 
      option.id.startsWith(selectedCategory)
    );
  };

  const getCategoryDisplayName = () => {
    const category = searchOptions.find(option => option.id === selectedCategory);
    return category ? category.name : 'All Categories';
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Reset search when category changes
  useEffect(() => {
    setSearchValue('');
    setShowDropdown(false);
  }, [selectedCategory]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    onSearch?.(value);

    if (value.trim().length > 0) {
      // Filter subcategories based on selected category and search term
      let filtered;
      if (selectedCategory === 'all') {
        filtered = searchOptions.filter(option =>
          option.type === 'subcategory' &&
          (option.name.toLowerCase().includes(value.toLowerCase()) ||
           option.category.toLowerCase().includes(value.toLowerCase()))
        );
      } else {
        // Only show subcategories from the selected category
        filtered = searchOptions.filter(option =>
          option.type === 'subcategory' &&
          option.category.toLowerCase() === selectedCategory.toLowerCase() &&
          option.name.toLowerCase().includes(value.toLowerCase())
        );
      }
      setFilteredOptions(filtered.slice(0, 12));
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchValue);
    setShowDropdown(false);
  };

  const handleOptionClick = (option: SearchOption) => {
    setSearchValue(option.name);
    setShowDropdown(false);
    onOptionSelect?.(option);
    onSearch?.(option.name);
  };

  const handleInputFocus = () => {
    if (searchValue.trim().length > 0) {
      // Show search results if user has typed something
      let filtered;
      if (selectedCategory === 'all') {
        filtered = searchOptions.filter(option =>
          option.type === 'subcategory' &&
          (option.name.toLowerCase().includes(searchValue.toLowerCase()) ||
           option.category.toLowerCase().includes(searchValue.toLowerCase()))
        );
      } else {
        // Only show subcategories from the selected category
        filtered = searchOptions.filter(option =>
          option.type === 'subcategory' &&
          option.category.toLowerCase() === selectedCategory.toLowerCase() &&
          option.name.toLowerCase().includes(searchValue.toLowerCase())
        );
      }
      setFilteredOptions(filtered.slice(0, 12));
      setShowDropdown(true);
    } else {
      // Show subcategories for selected category when clicking on empty search
      showAllSubcategories();
    }
  };

  const handleInputClick = () => {
    if (searchValue.trim().length === 0) {
      showAllSubcategories();
    } else {
      handleInputFocus();
    }
  };

  const handleDropdownToggle = () => {
    if (showDropdown) {
      setShowDropdown(false);
    } else {
      showAllSubcategories();
    }
  };

  const showAllSubcategories = () => {
    setShowDropdown(true);
    // Show subcategories based on selected category
    let subcategories;
    if (selectedCategory === 'all') {
      subcategories = searchOptions.filter(option => option.type === 'subcategory');
    } else {
      subcategories = searchOptions.filter(option => 
        option.type === 'subcategory' && 
        option.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }
    setFilteredOptions(subcategories);
  };

  return (
    <div className="w-full flex justify-center relative" ref={searchRef}>
      <div className="relative w-full max-w-2xl">
        <form onSubmit={handleSubmit}>
          <div className="items-center flex w-full gap-2 overflow-hidden text-base text-[#717680] font-normal flex-wrap bg-white p-4 rounded-[34px] mx-auto border border-gray-100 shadow-sm">
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/57274afdd1238290026fe0d60710347fbb4f5f8b?placeholderIfAbsent=true"
              className="aspect-[1] object-contain w-5 self-stretch shrink-0 my-auto"
              alt="Search Icon"
            />
            <input
              type="text"
              value={searchValue}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onClick={handleInputClick}
              placeholder={placeholder}
              className="text-[#717680] text-ellipsis text-base leading-6 self-stretch flex-1 shrink basis-[0%] my-auto max-md:max-w-full bg-transparent border-none outline-none"
            />
            <button
              type="button"
              onClick={handleDropdownToggle}
              className="flex items-center justify-center p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg 
                className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </form>

        {/* Subcategories Only Dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] max-h-96 overflow-hidden">
            <div className="py-2 max-h-80 overflow-y-auto">
              {filteredOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleOptionClick(option)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {option.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {option.category}
                      </div>
                    </div>
                    <div className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                      Service
                    </div>
                  </div>
                </button>
              ))}
              
              {filteredOptions.length === 0 && searchValue.trim().length > 0 && (
                <div className="px-4 py-8 text-center text-gray-500">
                  <div className="text-sm">No services found for "{searchValue}"</div>
                  <div className="text-xs mt-1">Try searching for a different service</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchInput;