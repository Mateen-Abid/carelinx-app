import React, { useState } from 'react';
import ServicesFilter from './ServicesFilter';

interface HeroSectionProps {
  viewMode: 'services' | 'clinics';
  onViewModeChange: (mode: 'services' | 'clinics') => void;
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ viewMode, onViewModeChange, selectedCategory, onCategoryChange }) => {

  return (
    <>
      {/* Blue Hero Section */}
      <section className="bg-[rgba(12,34,67,1)] w-full overflow-hidden">
        <div className="relative flex w-full flex-col py-8 sm:py-12 lg:py-[74px] px-4 sm:px-6 lg:px-8">
          {/* Background Pattern - Desktop only */}
          <div className="absolute z-0 w-[1372px] max-w-full left-[23px] bottom-0 opacity-20 hidden md:block">
            <div className="flex w-full gap-[40px_62px] flex-wrap max-md:max-w-full">
              {/* First row of pattern icons */}
              {[
                "https://api.builder.io/api/v1/image/assets/TEMP/8691badb429f030e6f81946f485ace6ebff15519?placeholderIfAbsent=true",
                "https://api.builder.io/api/v1/image/assets/TEMP/044066845b52b7bd7608421d8c29eee31d9d7197?placeholderIfAbsent=true",
                "https://api.builder.io/api/v1/image/assets/TEMP/1c7fb65545256dda41558d30844310f94c3ea304?placeholderIfAbsent=true",
                "https://api.builder.io/api/v1/image/assets/TEMP/a30cd8d8a0872735ded6b3eded0ef395f89f9907?placeholderIfAbsent=true",
                "https://api.builder.io/api/v1/image/assets/TEMP/34591e4c35be8c048b79a393b3b9fdb98a02f8ce?placeholderIfAbsent=true",
                "https://api.builder.io/api/v1/image/assets/TEMP/703a68c521a4c6183104e5b4379b7e51cb3ad781?placeholderIfAbsent=true",
                "https://api.builder.io/api/v1/image/assets/TEMP/f8afc59e353bf1b5cbae2b512b5fa88dc0dbf8e8?placeholderIfAbsent=true",
                "https://api.builder.io/api/v1/image/assets/TEMP/3491b2ef26dc04402f33ee0698efcfbc3045d768?placeholderIfAbsent=true",
                "https://api.builder.io/api/v1/image/assets/TEMP/58836a542d4d79160439370f0174c11474aa18ad?placeholderIfAbsent=true",
                "https://api.builder.io/api/v1/image/assets/TEMP/bb63c4c5f7814ef16c0e572c695807c0a8e9ff35?placeholderIfAbsent=true",
                "https://api.builder.io/api/v1/image/assets/TEMP/3b49c65b781e9bdb033125fd2a69d6f35c15d578?placeholderIfAbsent=true",
                "https://api.builder.io/api/v1/image/assets/TEMP/f4f02f8fd22d1bb7acd82c58de96c8c0c6c8dde7?placeholderIfAbsent=true",
                "https://api.builder.io/api/v1/image/assets/TEMP/112ed23539389d4bc22b91d8180152260c6f5dd1?placeholderIfAbsent=true",
                "https://api.builder.io/api/v1/image/assets/TEMP/6d917361cd23785886400ada5747c885c5ad8740?placeholderIfAbsent=true",
                "https://api.builder.io/api/v1/image/assets/TEMP/0aa69a8eb34ebfd99c822cb264738ebb25137e2f?placeholderIfAbsent=true"
              ].map((src, index) => (
                <img
                  key={`row1-${index}`}
                  src={src}
                  className={`aspect-[1] object-contain ${index < 10 ? 'w-[33px]' : 'w-9'} shrink-0`}
                  alt=""
                />
              ))}
            </div>
            
            {/* Additional rows with similar pattern */}
            <div className="flex w-full gap-[40px_62px] flex-wrap mt-12 pl-[53px] max-md:max-w-full max-md:mt-10 max-md:pl-5">
              {/* Second row pattern - simplified for brevity */}
              {Array.from({ length: 14 }, (_, index) => (
                <img
                  key={`row2-${index}`}
                  src={`https://api.builder.io/api/v1/image/assets/TEMP/fa3c32dfd01808ce8d50b995507aa1beba1e135a?placeholderIfAbsent=true`}
                  className="aspect-[0.97] object-contain w-8 shrink-0"
                  alt=""
                />
              ))}
            </div>
            
            {/* Third and fourth rows with similar patterns */}
            <div className="flex w-full gap-[40px_62px] flex-wrap mt-12 max-md:max-w-full max-md:mt-10">
              {Array.from({ length: 15 }, (_, index) => (
                <img
                  key={`row3-${index}`}
                  src={`https://api.builder.io/api/v1/image/assets/TEMP/447972b465517e57839415fe774c8801b4eb6917?placeholderIfAbsent=true`}
                  className="aspect-[1.03] object-contain w-[33px] shrink-0"
                  alt=""
                />
              ))}
            </div>
            
            <div className="flex w-full gap-[40px_62px] mt-12 pl-[53px] max-md:max-w-full max-md:mt-10 max-md:pl-5">
              {Array.from({ length: 15 }, (_, index) => (
                <img
                  key={`row4-${index}`}
                  src={`https://api.builder.io/api/v1/image/assets/TEMP/a0005fe56e6bbaee0804e066c985d2970da7d331?placeholderIfAbsent=true`}
                  className="aspect-[3.56] object-contain w-8 shrink-0"
                  alt=""
                />
              ))}
            </div>
          </div>
          
          {/* Desktop Content */}
          <div className="self-center z-10 hidden md:flex w-full max-w-2xl flex-col items-center">
            {/* Toggle between Services and Clinics */}
            <div className="flex justify-center w-full">
              <div className="flex bg-white rounded-full p-1 border border-gray-200 w-full sm:w-auto">
                <button
                  onClick={() => onViewModeChange('services')}
                  className={`flex items-center justify-center gap-1 sm:gap-2 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 rounded-full text-sm sm:text-base font-medium transition-colors flex-1 sm:flex-none ${
                    viewMode === 'services'
                      ? 'bg-[rgba(0,255,162,1)] text-black'
                      : 'text-gray-600 hover:text-black'
                  }`}
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  <span>Services</span>
                </button>
                <button
                  onClick={() => onViewModeChange('clinics')}
                  className={`flex items-center justify-center gap-1 sm:gap-2 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 rounded-full text-sm sm:text-base font-medium transition-colors flex-1 sm:flex-none ${
                    viewMode === 'clinics'
                      ? 'bg-[rgba(0,255,162,1)] text-black'
                      : 'text-gray-600 hover:text-black'
                  }`}
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                  </svg>
                  <span>Clinics</span>
                </button>
              </div>
            </div>
            <p className="text-neutral-300 text-sm sm:text-base font-normal tracking-[-0.32px] mt-4 text-center px-4">
              Quickly find doctors, clinics, or services you need.
            </p>
            {viewMode === 'services' && (
              <div className="mt-6 w-full px-4 sm:px-0 relative overflow-visible">
                <ServicesFilter 
                  selectedCategory={selectedCategory}
                  onCategoryChange={onCategoryChange}
                />
              </div>
            )}
          </div>

          {/* Mobile Header with Logo and Greeting - Inside blue section */}
          <div className="flex md:hidden items-center justify-between mb-6 z-10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[rgba(0,255,162,1)] rounded-sm flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full"></div>
              </div>
              <span className="text-white font-semibold text-lg">carelinx</span>
            </div>
          </div>
          
          {/* Mobile Greeting - Inside blue section */}
          <div className="flex md:hidden mb-6 z-10">
            <div>
              <h2 className="text-white text-lg font-medium">Hi, John Doe</h2>
              <p className="text-gray-300 text-sm">Good morning</p>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Content Section - Outside blue background */}
      <section className="md:hidden bg-white px-4 py-6">
        {/* Mobile Toggle Buttons */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => onViewModeChange('services')}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-colors flex-1 ${
              viewMode === 'services'
                ? 'bg-gray-800 text-white'
                : 'bg-[rgba(0,255,162,1)] text-black'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span>Services</span>
          </button>
          <button
            onClick={() => onViewModeChange('clinics')}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-colors flex-1 ${
              viewMode === 'clinics'
                ? 'bg-gray-800 text-white'
                : 'bg-[rgba(0,255,162,1)] text-black'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
            </svg>
            <span>Clinics</span>
          </button>
        </div>

        {/* Mobile Services Grid */}
        {viewMode === 'services' && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <button
              onClick={() => onCategoryChange('all')}
              className={`flex flex-col items-center justify-center p-4 rounded-lg transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <svg className="w-6 h-6 mb-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
              </svg>
              <span className="text-xs">All</span>
            </button>
            
            <button
              onClick={() => onCategoryChange('cardiology')}
              className={`flex flex-col items-center justify-center p-4 rounded-lg transition-colors ${
                selectedCategory === 'cardiology'
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <svg className="w-6 h-6 mb-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              <span className="text-xs">Cardiology</span>
            </button>
            
            <button
              onClick={() => onCategoryChange('neurology')}
              className={`flex flex-col items-center justify-center p-4 rounded-lg transition-colors ${
                selectedCategory === 'neurology'
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <svg className="w-6 h-6 mb-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
              <span className="text-xs">Neurology</span>
            </button>
            
            <button
              onClick={() => onCategoryChange('ophthalmology')}
              className={`flex flex-col items-center justify-center p-4 rounded-lg transition-colors ${
                selectedCategory === 'ophthalmology'
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <svg className="w-6 h-6 mb-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
              </svg>
              <span className="text-xs">Ophthalmology</span>
            </button>
          </div>
        )}

        {/* Mobile Clinic Dropdown */}
        {viewMode === 'clinics' && (
          <div className="mb-6">
            <div className="relative">
              <select className="w-full bg-gray-100 text-gray-700 p-4 rounded-lg border border-gray-300 appearance-none">
                <option>Acme T...</option>
                <option>City Medical Center</option>
                <option>Downtown Clinic</option>
                <option>Health Plus</option>
              </select>
              <svg className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </div>
          </div>
        )}
      </section>
    </>
  );
};

export default HeroSection;
