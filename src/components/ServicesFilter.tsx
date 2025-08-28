import React, { useState } from 'react';

interface ServiceCategory {
  id: string;
  name: string;
  icon?: string;
}

interface ServicesFilterProps {
  onCategoryChange: (categoryId: string) => void;
  selectedCategory: string;
}

const ServicesFilter: React.FC<ServicesFilterProps> = ({ onCategoryChange, selectedCategory }) => {

  const categories: ServiceCategory[] = [
    { id: 'all', name: 'All' },
    { 
      id: 'cardiology', 
      name: 'Cardiology',
      icon: 'https://api.builder.io/api/v1/image/assets/TEMP/e2754599538b7acbc844ad86bedce0a0cf814919?placeholderIfAbsent=true'
    },
    { 
      id: 'neurology', 
      name: 'Neurology',
      icon: 'https://api.builder.io/api/v1/image/assets/TEMP/3845314e9e7788a7e29c89a13cd900cb8122101c?placeholderIfAbsent=true'
    },
    { 
      id: 'general-medicine', 
      name: 'General Medicine',
      icon: 'https://api.builder.io/api/v1/image/assets/TEMP/0678807531022174230ccdef75b23ab0e00ebd73?placeholderIfAbsent=true'
    },
    { 
      id: 'pediatrics', 
      name: 'Pediatrics',
      icon: 'https://api.builder.io/api/v1/image/assets/TEMP/4e372a066ba413333951a22ee2b3141eb45645d6?placeholderIfAbsent=true'
    },
    { 
      id: 'orthopedics', 
      name: 'Orthopedics',
      icon: 'https://api.builder.io/api/v1/image/assets/TEMP/fd4251bcbc376947e86818f9aca203ca62e6c89d?placeholderIfAbsent=true'
    },
    { 
      id: 'emergency-care', 
      name: 'Emergency Care',
      icon: 'https://api.builder.io/api/v1/image/assets/TEMP/0254cc92113d67bb61b90eecb83e3db232fd2248?placeholderIfAbsent=true'
    },
    { 
      id: 'dermatology', 
      name: 'Dermatology',
      icon: 'https://api.builder.io/api/v1/image/assets/TEMP/b3a2f114b2c7d19ce223bc4dea7f8a90eaab1b28?placeholderIfAbsent=true'
    }
  ];

  const handleCategorySelect = (categoryId: string) => {
    onCategoryChange(categoryId);
  };

  const CategoryPill: React.FC<{ category: ServiceCategory; isSelected: boolean }> = ({ 
    category, 
    isSelected 
  }) => (
    <button
      onClick={() => handleCategorySelect(category.id)}
      className={`flex items-center gap-1.5 justify-center px-3.5 py-3 rounded-[99px] transition-colors ${
        isSelected 
          ? 'bg-[rgba(0,255,162,1)] text-black' 
          : 'bg-white text-black hover:bg-gray-50'
      } ${category.id === 'all' ? 'w-16' : 'min-h-[38px]'}`}
    >
      {category.icon && (
        <img
          src={category.icon}
          className="aspect-[1] object-contain w-[18px] self-stretch shrink-0 my-auto"
          alt=""
        />
      )}
      <span className="self-stretch my-auto text-xs font-normal whitespace-nowrap">
        {category.name}
      </span>
    </button>
  );

  return (
    <section className="min-h-[137px] w-full text-xs text-black font-normal mt-6 px-8 max-md:max-w-full max-md:px-5">
      <div className="flex w-[116px] max-w-full items-center gap-2.5 text-2xl whitespace-nowrap tracking-[-1px] justify-center">
        <h2 className="self-stretch w-[116px] my-auto">Services</h2>
      </div>
      
      <div className="flex w-full items-center gap-2 flex-wrap mt-4 max-md:max-w-full">
        {categories.map((category) => (
          <CategoryPill
            key={category.id}
            category={category}
            isSelected={selectedCategory === category.id}
          />
        ))}
      </div>
      
    </section>
  );
};

export default ServicesFilter;
