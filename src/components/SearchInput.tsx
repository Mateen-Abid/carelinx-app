import React, { useState } from 'react';

interface SearchInputProps {
  placeholder?: string;
  onSearch?: (value: string) => void;
}

const SearchInput: React.FC<SearchInputProps> = ({ 
  placeholder = "Search by service, clinic, or doctor's name",
  onSearch 
}) => {
  const [searchValue, setSearchValue] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    onSearch?.(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchValue);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="items-center flex w-full gap-2 overflow-hidden text-base text-[#717680] font-normal flex-wrap bg-white p-4 rounded-[34px]">
        <img
          src="https://api.builder.io/api/v1/image/assets/TEMP/57274afdd1238290026fe0d60710347fbb4f5f8b?placeholderIfAbsent=true"
          className="aspect-[1] object-contain w-5 self-stretch shrink-0 my-auto"
          alt="Search Icon"
        />
        <input
          type="text"
          value={searchValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="text-[#717680] text-ellipsis text-base leading-6 self-stretch flex-1 shrink basis-[0%] my-auto max-md:max-w-full bg-transparent border-none outline-none"
        />
      </div>
    </form>
  );
};

export default SearchInput;
