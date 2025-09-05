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
}

const SearchInput: React.FC<SearchInputProps> = ({ 
  placeholder = "Search by service, clinic, or doctor's name",
  onSearch,
  onOptionSelect 
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [filteredOptions, setFilteredOptions] = useState<SearchOption[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const searchOptions: SearchOption[] = [
    // Main Categories
    { id: 'cardiology', name: 'Cardiology', category: 'Medical Specialty', type: 'category' },
    { id: 'neurology', name: 'Neurology', category: 'Medical Specialty', type: 'category' },
    { id: 'ophthalmology', name: 'Ophthalmology', category: 'Medical Specialty', type: 'category' },
    { id: 'dermatology', name: 'Dermatology', category: 'Medical Specialty', type: 'category' },
    { id: 'general-medicine', name: 'General Medicine', category: 'Medical Specialty', type: 'category' },
    { id: 'pediatrics', name: 'Pediatrics', category: 'Medical Specialty', type: 'category' },
    { id: 'orthopedics', name: 'Orthopedics', category: 'Medical Specialty', type: 'category' },

    // Cardiology Subcategories
    { id: 'cardiology-ecg', name: 'ECG', category: 'Cardiology', type: 'subcategory' },
    { id: 'cardiology-echo', name: 'Echocardiogram', category: 'Cardiology', type: 'subcategory' },
    { id: 'cardiology-stress-test', name: 'Stress Test', category: 'Cardiology', type: 'subcategory' },
    { id: 'cardiology-holter', name: 'Holter Monitor', category: 'Cardiology', type: 'subcategory' },
    { id: 'cardiology-angiogram', name: 'Angiogram', category: 'Cardiology', type: 'subcategory' },
    { id: 'cardiology-ct-scan', name: 'Cardiac CT Scan', category: 'Cardiology', type: 'subcategory' },

    // Neurology Subcategories
    { id: 'neurology-mri', name: 'Brain MRI', category: 'Neurology', type: 'subcategory' },
    { id: 'neurology-ct-scan', name: 'Brain CT Scan', category: 'Neurology', type: 'subcategory' },
    { id: 'neurology-eeg', name: 'EEG', category: 'Neurology', type: 'subcategory' },
    { id: 'neurology-emg', name: 'EMG', category: 'Neurology', type: 'subcategory' },
    { id: 'neurology-lumbar-puncture', name: 'Lumbar Puncture', category: 'Neurology', type: 'subcategory' },

    // Ophthalmology Subcategories
    { id: 'ophthalmology-retinal-exam', name: 'Retinal Examination', category: 'Ophthalmology', type: 'subcategory' },
    { id: 'ophthalmology-glaucoma-test', name: 'Glaucoma Test', category: 'Ophthalmology', type: 'subcategory' },
    { id: 'ophthalmology-cataract-surgery', name: 'Cataract Surgery', category: 'Ophthalmology', type: 'subcategory' },
    { id: 'ophthalmology-vision-test', name: 'Vision Test', category: 'Ophthalmology', type: 'subcategory' },
    { id: 'ophthalmology-oct', name: 'OCT Scan', category: 'Ophthalmology', type: 'subcategory' },

    // Dermatology Subcategories
    { id: 'dermatology-acne', name: 'Acne & Pimples', category: 'Dermatology', type: 'subcategory' },
    { id: 'dermatology-eczema', name: 'Eczema & Dermatitis', category: 'Dermatology', type: 'subcategory' },
    { id: 'dermatology-psoriasis', name: 'Psoriasis', category: 'Dermatology', type: 'subcategory' },
    { id: 'dermatology-rosacea', name: 'Rosacea', category: 'Dermatology', type: 'subcategory' },
    { id: 'dermatology-allergies', name: 'Skin Allergies', category: 'Dermatology', type: 'subcategory' },
    { id: 'dermatology-warts', name: 'Warts & Moles', category: 'Dermatology', type: 'subcategory' },
    { id: 'dermatology-scars', name: 'Scars & Stretch Marks', category: 'Dermatology', type: 'subcategory' },

    // General Medicine Subcategories
    { id: 'general-checkup', name: 'General Checkup', category: 'General Medicine', type: 'subcategory' },
    { id: 'general-blood-test', name: 'Blood Test', category: 'General Medicine', type: 'subcategory' },
    { id: 'general-vaccination', name: 'Vaccination', category: 'General Medicine', type: 'subcategory' },
    { id: 'general-health-screening', name: 'Health Screening', category: 'General Medicine', type: 'subcategory' },

    // Pediatrics Subcategories
    { id: 'pediatrics-vaccination', name: 'Child Vaccination', category: 'Pediatrics', type: 'subcategory' },
    { id: 'pediatrics-growth-check', name: 'Growth Check', category: 'Pediatrics', type: 'subcategory' },
    { id: 'pediatrics-development', name: 'Development Assessment', category: 'Pediatrics', type: 'subcategory' },
    { id: 'pediatrics-illness', name: 'Childhood Illness', category: 'Pediatrics', type: 'subcategory' },

    // Orthopedics Subcategories
    { id: 'orthopedics-xray', name: 'X-Ray', category: 'Orthopedics', type: 'subcategory' },
    { id: 'orthopedics-mri', name: 'Orthopedic MRI', category: 'Orthopedics', type: 'subcategory' },
    { id: 'orthopedics-ct-scan', name: 'Orthopedic CT Scan', category: 'Orthopedics', type: 'subcategory' },
    { id: 'orthopedics-joint-replacement', name: 'Joint Replacement', category: 'Orthopedics', type: 'subcategory' },
    { id: 'orthopedics-fracture-care', name: 'Fracture Care', category: 'Orthopedics', type: 'subcategory' }
  ];

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    onSearch?.(value);

    if (value.trim().length > 0) {
      const filtered = searchOptions.filter(option =>
        option.name.toLowerCase().includes(value.toLowerCase()) ||
        option.category.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 8); // Limit to 8 results
      setFilteredOptions(filtered);
      setShowDropdown(true);
    } else {
      setFilteredOptions([]);
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
    if (searchValue.trim().length > 0 && filteredOptions.length > 0) {
      setShowDropdown(true);
    }
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
              placeholder={placeholder}
              className="text-[#717680] text-ellipsis text-base leading-6 self-stretch flex-1 shrink basis-[0%] my-auto max-md:max-w-full bg-transparent border-none outline-none"
            />
          </div>
        </form>

        {/* Search Dropdown */}
        {showDropdown && filteredOptions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] max-h-64 overflow-y-auto">
            <div className="py-2">
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
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      option.type === 'category' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {option.type === 'category' ? 'Specialty' : 'Service'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchInput;