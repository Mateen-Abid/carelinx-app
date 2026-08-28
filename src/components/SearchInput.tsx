import React, { useState, useRef, useEffect, useMemo } from 'react';
import { getAllServices, getAllCategories, clinicsData } from '@/data/clinicsData';
import { useTranslation } from 'react-i18next';
import { localizedStoredText } from '@/utils/localizedContent';

interface SearchOption {
  id: string;
  name: string;
  label?: string;
  category: string;
  type: 'category' | 'subcategory';
  bookingType?: 'service' | 'treatment';
}

interface SearchInputProps {
  placeholder?: string;
  onSearch?: (value: string) => void;
  onOptionSelect?: (option: SearchOption) => void;
  selectedCategory?: string;
  currentSearchQuery?: string;
  clinicServices?: SearchOption[]; // Add clinic-specific services
  superAdminServices?: Array<{id: string, name: string, name_ar?: string | null, specialty_id: string, specialty_name: string}>;
  superAdminSpecialties?: Array<{id: string, name: string, name_ar?: string | null}>;
}

const SearchInput: React.FC<SearchInputProps> = ({ 
  placeholder,
  onSearch,
  onOptionSelect,
  selectedCategory = 'all',
  currentSearchQuery = '',
  clinicServices,
  superAdminServices = [],
  superAdminSpecialties = []
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  // Dynamic placeholder based on selected category
  const getPlaceholder = () => {
    if (selectedCategory === 'dermatology') {
      return t('Search dermatology services...');
    } else if (selectedCategory === 'dentistry') {
      return t('Search dental services...');
    } else {
      return t("Search by service, clinic, or doctor's name");
    }
  };
  const [searchValue, setSearchValue] = useState('');
  const [filteredOptions, setFilteredOptions] = useState<SearchOption[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<'categories' | 'services'>('categories');
  const searchRef = useRef<HTMLDivElement>(null);

  const searchOptions: SearchOption[] = useMemo(() => {
    const options: SearchOption[] = [];
    
    // If clinic-specific services are provided, use those instead of global data
    // Even if the array is empty (clinic has no services for this category)
    if (clinicServices !== undefined) {
      console.log('SearchInput - Using clinic-specific services:', clinicServices);
      return clinicServices.map((option) => ({
        ...option,
        label: option.label || localizedStoredText(
          option.name,
          superAdminServices.find((service) => service.name === option.name)?.name_ar,
          i18n.language,
        ),
      }));
    }
    
    // Check if a main category is selected
    const isMainCategorySelected = selectedCategory === 'dermatology' || selectedCategory === 'dentistry';
    
    if (isMainCategorySelected) {
      // Map category ID to actual category names (including all possible categories)
      const categoryMap: { [key: string]: string[] } = {
        'dermatology': ['Dermatology'],
        'dentistry': ['Dental', 'Orthodontics', 'Dental Implants', 'Pediatric Dentistry', 
                      'Fixed & Removable Prosthodontics', 'Restorative & Cosmetic Dentistry',
                      'Root Canal & Endodontics', 'Periodontal Treatment', 
                      'Oral & Maxillofacial Surgery', 'General Dentistry']
      };
      
      // Get all category names that match the selected category
      const categoryNames = categoryMap[selectedCategory] || [];
      
      // Add super admin services for specialties that match the selected category
      superAdminSpecialties.forEach(specialty => {
        if (categoryNames.includes(specialty.name)) {
          // Add services from super admin for this specialty
          superAdminServices
            .filter(service => service.specialty_name === specialty.name)
            .forEach(service => {
              if (!options.find(opt => opt.id === `super-${service.id}`)) {
                options.push({
                  id: `super-${service.id}`,
                  name: service.name,
                  label: localizedStoredText(service.name, service.name_ar, i18n.language),
                  category: service.specialty_name,
                  type: 'subcategory',
                  bookingType: 'service',
                });
              }
            });
        }
      });
      
      // Show all services from all hardcoded clinics that match any of these categories
      clinicsData.forEach(clinic => {
        Object.entries(clinic.categories).forEach(([categoryName, services]) => {
          // Check if this category matches the selected category
          if (categoryNames.includes(categoryName)) {
            services.forEach(service => {
              if (!options.find(opt => opt.id === service.id)) {
                options.push({
                  id: service.id,
                  name: service.name,
                  category: service.category,
                  type: 'subcategory',
                  bookingType: 'service',
                });
              }
            });
          }
        });
      });
    } else if (selectedCategory && selectedCategory !== 'all') {
      // Handle super admin specialty selected by ID (when specialty is selected directly)
      const selectedSpecialty = superAdminSpecialties.find(s => s.id === selectedCategory || s.name.toLowerCase() === selectedCategory.toLowerCase());
      if (selectedSpecialty) {
        // Add all services for this super admin specialty
        superAdminServices
          .filter(service => service.specialty_id === selectedSpecialty.id || service.specialty_name === selectedSpecialty.name)
          .forEach(service => {
            if (!options.find(opt => opt.id === `super-${service.id}`)) {
              options.push({
                id: `super-${service.id}`,
                name: service.name,
                label: localizedStoredText(service.name, service.name_ar, i18n.language),
                category: service.specialty_name,
                type: 'subcategory',
                bookingType: 'service',
              });
            }
          });
      }
    } else {
      // Show main categories when no category is selected
      getAllCategories().forEach(category => {
        const categoryId = category.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '');
        options.push({
          id: categoryId,
          name: category,
          category: 'Medical Specialty',
          type: 'category'
        });
      });
    }

    return options;
  }, [selectedCategory, clinicServices, superAdminServices, superAdminSpecialties, i18n.language]);

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
    const categoryMap: { [key: string]: string } = {
      'all': 'All Categories',
      'dentistry': 'Dental',
      'dermatology': 'Dermatology'
    };
    return categoryMap[selectedCategory] || 'All Categories';
  };

  const getPlaceholderText = () => {
    // Use currentSearchQuery to show the actual filter status
    if (currentSearchQuery && currentSearchQuery.trim()) {
      return `Filtering by: "${currentSearchQuery}" - Type to search again`;
    }
    return `Search in ${getCategoryDisplayName()}...`;
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

  // Sync search value with current search query
  useEffect(() => {
    setSearchValue(currentSearchQuery);
  }, [currentSearchQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    onSearch?.(value);

    // Always show dropdown when typing or when input is focused
    if (value.trim().length > 0) {
      // Filter options based on search term
      const filtered = searchOptions.filter(option =>
        (option.label || option.name).toLowerCase().includes(value.toLowerCase()) ||
        option.name.toLowerCase().includes(value.toLowerCase()) ||
        option.category.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredOptions(filtered);
    } else {
      // Show all available options when no search term
      setFilteredOptions(searchOptions);
    }
    setShowDropdown(true);
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
    // Show all available options when focused
    if (searchValue.trim().length > 0) {
      // Filter based on current search value
      const filtered = searchOptions.filter(option =>
        (option.label || option.name).toLowerCase().includes(searchValue.toLowerCase()) ||
        option.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        option.category.toLowerCase().includes(searchValue.toLowerCase())
      );
      setFilteredOptions(filtered);
    } else {
      // Show all available options when no search term
      setFilteredOptions(searchOptions);
    }
    setShowDropdown(true);
  };

  const handleInputClick = () => {
    // Only show dropdown if it's not already open
    if (!showDropdown) {
      showAllSubcategories();
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
    // Show all available options based on selected category
    setFilteredOptions(searchOptions);
  };

  return (
    <div className="w-full flex justify-center relative" ref={searchRef}>
      <div className="relative w-full max-w-2xl">
        <form onSubmit={handleSubmit}>
          <div className={`items-center flex w-full gap-2 overflow-hidden text-base text-[#717680] font-normal flex-wrap bg-white p-4 rounded-[34px] mx-auto border border-gray-100 shadow-sm ${isRtl ? 'flex-row-reverse' : ''}`}>
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/57274afdd1238290026fe0d60710347fbb4f5f8b?placeholderIfAbsent=true"
              className="aspect-[1] object-contain w-5 self-stretch shrink-0 my-auto"
              alt={t('Search Icon')}
            />
            <input
              type="text"
              value={searchValue}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onClick={handleInputClick}
              placeholder={placeholder || getPlaceholder()}
              className={`text-[#717680] text-ellipsis text-base leading-6 self-stretch flex-1 shrink basis-[0%] my-auto max-md:max-w-full bg-transparent border-none outline-none ${isRtl ? 'text-right' : 'text-left'}`}
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => {
                  setSearchValue('');
                  onSearch?.('');
                  setShowDropdown(false);
                }}
                className={`flex items-center justify-center p-1 hover:bg-gray-100 rounded-full transition-colors ${isRtl ? 'ml-1' : 'mr-1'}`}
                title={t('Clear search')}
              >
                <svg 
                  className="w-4 h-4 text-gray-500" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
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
                        {option.label || option.name}
                      </div>
                    </div>
                    <div className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                      {option.bookingType === 'treatment' ? t('Treatment') : t('Service')}
                    </div>
                  </div>
                </button>
              ))}
              
              {filteredOptions.length === 0 && searchValue.trim().length > 0 && (
                <div className="px-4 py-8 text-center text-gray-500">
                  <div className="text-sm">{t('No services found for "{{searchValue}}"', { searchValue })}</div>
                  <div className="text-xs mt-1">{t('Try searching for a different service')}</div>
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