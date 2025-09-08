import React from 'react';
import { useNavigate } from 'react-router-dom';

interface ServiceCardProps {
  clinicName: string;
  address: string;
  serviceName: string;
  specialty: string;
  timeSchedule: string;
  serviceIcon: string;
  clinicIcon: string;
  timeIcon: string;
  serviceId?: string; // Add service ID for proper navigation
  isSpecial?: boolean;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
  clinicName,
  address,
  serviceName,
  specialty,
  timeSchedule,
  serviceIcon,
  clinicIcon,
  timeIcon,
  serviceId,
  isSpecial = false
}) => {
  const navigate = useNavigate();

  // Navigate to service details page using the actual service ID
  const handleServiceClick = () => {
    if (serviceId) {
      navigate(`/service/${serviceId}`);
    } else {
      // Fallback to name-based ID if serviceId is not provided
      const fallbackId = serviceName.toLowerCase().replace(/\s+/g, '-');
      navigate(`/service/${fallbackId}`);
    }
  };

  return (
    <article 
      onClick={handleServiceClick}
      className={`bg-white overflow-hidden w-full min-w-0 h-auto sm:h-[320px] flex flex-row sm:flex-col px-2 sm:px-2 lg:px-3 py-1.5 sm:py-2 lg:py-3 rounded-[12px] sm:rounded-[18px] cursor-pointer hover:shadow-lg transition-shadow duration-200 ${isSpecial ? 'relative' : ''}`}
    >
      
      {/* Mobile compact layout */}
      <div className="sm:hidden flex items-center gap-3 w-full">
        {/* Left side - Clinic logo */}
        <img
          src={clinicIcon}
          className="w-6 h-6 object-contain rounded shrink-0"
          alt={`${clinicName} logo`}
        />
        
        {/* Right side - Clinic info */}
        <div className="min-w-0 flex-1">
          <div className="text-black text-sm font-medium mb-1">
            {clinicName}
          </div>
          {/* Service name tag */}
          <div className="bg-[#0C2243] text-white px-2 py-0.5 rounded-full text-xs font-medium mb-1 inline-block">
            {serviceName}
          </div>
          <div className="text-gray-600 text-xs">
            {timeSchedule}
          </div>
        </div>
      </div>

      {/* Desktop layout - keep existing */}
      <div className="hidden sm:flex w-full flex-col items-stretch">
        {/* Clinic info section */}
        <div className="flex w-full items-center gap-2 mb-3">
          <img
            src={clinicIcon}
            className="w-6 h-6 object-contain rounded shrink-0"
            alt={`${clinicName} logo`}
          />
          <div className="flex flex-col min-w-0 flex-1">
            <div className="text-black text-sm font-medium truncate">
              {clinicName}
            </div>
            {/* Service name tag */}
            <div className="bg-[#0C2243] text-white px-2 py-0.5 rounded-full text-xs font-medium mb-1 inline-block w-fit">
              {serviceName}
            </div>
            <div className="text-gray-600 text-xs truncate">
              {address}
            </div>
          </div>
        </div>

        {/* Service icon section */}
        <div className="flex justify-center mb-3">
          <div className="bg-[rgba(0,255,162,1)] flex w-16 h-16 items-center justify-center rounded-full">
            <img
              src={serviceIcon}
              className="w-8 h-8 object-contain"
              alt={serviceName}
            />
          </div>
        </div>
        
        {/* Service info section */}
        <div className="flex flex-col items-center text-center mb-3">
          <div className="text-black text-lg font-medium mb-2">
            {serviceName}
          </div>
          <div className="bg-neutral-50 border border-[#E9EAEB] px-3 py-1 rounded-full">
            <div className="text-xs text-black font-medium">
              {specialty}
            </div>
          </div>
        </div>
      </div>
      
      {/* Spacer to push timing to bottom - desktop only */}
      <div className="flex-1 hidden sm:block"></div>
      
      {/* Timing section - desktop only */}
      <div className="w-full text-xs hidden sm:block">
        <div className="text-[rgba(98,98,98,1)] font-normal">
          Time
        </div>
        <div className="w-full text-black font-medium text-center mt-1.5">
          <div className="items-center border flex gap-0.5 bg-neutral-50 pl-1.5 pr-2 py-0.5 rounded-full border-solid border-[#E9EAEB]">
            <img
              src={timeIcon}
              className="aspect-[1] object-contain w-3 self-stretch shrink-0 my-auto"
              alt="Time icon"
            />
            <div className="text-xs leading-[18px] self-stretch my-auto">
              {timeSchedule}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

export default ServiceCard;
