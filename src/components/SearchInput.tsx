import React, { useState, useRef, useEffect, useMemo } from 'react';
import { getAllServices, getAllCategories } from '@/data/clinicsData';

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
  currentSearchQuery?: string;
}

const SearchInput: React.FC<SearchInputProps> = ({ 
  placeholder = "Search by service, clinic, or doctor's name",
  onSearch,
  onOptionSelect,
  selectedCategory = 'all',
  currentSearchQuery = ''
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [filteredOptions, setFilteredOptions] = useState<SearchOption[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<'categories' | 'services'>('categories');
  const searchRef = useRef<HTMLDivElement>(null);

  const searchOptions: SearchOption[] = useMemo(() => {
    const options: SearchOption[] = [];
    
    // Add main categories
    getAllCategories().forEach(category => {
      const categoryId = category.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '');
      options.push({
        id: categoryId,
        name: category,
        category: 'Medical Specialty',
        type: 'category'
      });
    });

    // Add all services as subcategories
    getAllServices().forEach(service => {
      options.push({
        id: service.id,
        name: service.name,
        category: service.category,
        type: 'subcategory'
      });
    });

    return options;
  }, []);

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
        // Map category ID to category name for proper matching
        const categoryNameMap: { [key: string]: string } = {
          'dentistry': 'Dental',
          'dermatology': 'Dermatology',
          'orthodontics': 'Orthodontics',
          'dental-implants': 'Dental Implants',
          'pediatric-dentistry': 'Pediatric Dentistry',
          'fixed-removable-prosthodontics': 'Fixed & Removable Prosthodontics',
          'restorative-cosmetic-dentistry': 'Restorative & Cosmetic Dentistry',
          'root-canal-endodontics': 'Root Canal & Endodontics',
          'periodontal-treatment': 'Periodontal Treatment',
          'oral-maxillofacial-surgery': 'Oral & Maxillofacial Surgery',
          'general-dentistry': 'General Dentistry'
        };
        
        const categoryName = categoryNameMap[selectedCategory] || selectedCategory;
        
        // Only show subcategories from the selected category
        filtered = searchOptions.filter(option =>
          option.type === 'subcategory' &&
          option.category.toLowerCase() === categoryName.toLowerCase() &&
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
        // Map category ID to category name for proper matching
        const categoryNameMap: { [key: string]: string } = {
          'dentistry': 'Dental',
          'dermatology': 'Dermatology',
          'orthodontics': 'Orthodontics',
          'dental-implants': 'Dental Implants',
          'pediatric-dentistry': 'Pediatric Dentistry',
          'fixed-removable-prosthodontics': 'Fixed & Removable Prosthodontics',
          'restorative-cosmetic-dentistry': 'Restorative & Cosmetic Dentistry',
          'root-canal-endodontics': 'Root Canal & Endodontics',
          'periodontal-treatment': 'Periodontal Treatment',
          'oral-maxillofacial-surgery': 'Oral & Maxillofacial Surgery',
          'general-dentistry': 'General Dentistry'
        };
        
        const categoryName = categoryNameMap[selectedCategory] || selectedCategory;
        
        // Only show subcategories from the selected category
        filtered = searchOptions.filter(option =>
          option.type === 'subcategory' &&
          option.category.toLowerCase() === categoryName.toLowerCase() &&
          option.name.toLowerCase().includes(searchValue.toLowerCase())
        );
      }
      setFilteredOptions(filtered.slice(0, 12));
      setShowDropdown(true);
    } else {
      // Show subcategories for selected category when focusing on empty search
      showAllSubcategories();
    }
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
    // Show subcategories based on selected category
    let subcategories;
    if (selectedCategory === 'all') {
      subcategories = searchOptions.filter(option => option.type === 'subcategory');
    } else {
      // Map category ID to category name for proper matching
      const categoryNameMap: { [key: string]: string } = {
        'dentistry': 'Dental',
        'dermatology': 'Dermatology',
        'orthodontics': 'Orthodontics',
        'dental-implants': 'Dental Implants',
        'pediatric-dentistry': 'Pediatric Dentistry',
        'fixed-removable-prosthodontics': 'Fixed & Removable Prosthodontics',
        'restorative-cosmetic-dentistry': 'Restorative & Cosmetic Dentistry',
        'root-canal-endodontics': 'Root Canal & Endodontics',
        'periodontal-treatment': 'Periodontal Treatment',
        'oral-maxillofacial-surgery': 'Oral & Maxillofacial Surgery',
        'general-dentistry': 'General Dentistry'
      };
      
      const categoryName = categoryNameMap[selectedCategory] || selectedCategory;
      
      subcategories = searchOptions.filter(option => 
        option.type === 'subcategory' && 
        option.category.toLowerCase() === categoryName.toLowerCase()
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
              placeholder={getPlaceholderText()}
              className="text-[#717680] text-ellipsis text-base leading-6 self-stretch flex-1 shrink basis-[0%] my-auto max-md:max-w-full bg-transparent border-none outline-none"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => {
                  setSearchValue('');
                  onSearch?.('');
                  setShowDropdown(false);
                }}
                className="flex items-center justify-center p-1 hover:bg-gray-100 rounded-full transition-colors mr-1"
                title="Clear search"
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