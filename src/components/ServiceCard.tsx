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
  isSpecial = false
}) => {
  const navigate = useNavigate();

  // Convert service name to URL-friendly ID
  const getServiceId = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '-');
  };

  // Navigate to service details page
  const handleServiceClick = () => {
    const serviceId = getServiceId(serviceName);
    navigate(`/service/${serviceId}`);
  };

  return (
    <article 
      onClick={handleServiceClick}
      className={`bg-white overflow-hidden w-full min-w-0 h-auto sm:h-[320px] flex flex-row sm:flex-col px-2 sm:px-2 lg:px-3 py-1.5 sm:py-2 lg:py-3 rounded-[12px] sm:rounded-[18px] cursor-pointer hover:shadow-lg transition-shadow duration-200 ${isSpecial ? 'relative' : ''}`}
    >
      {isSpecial && (
        <>
          <div className="hidden sm:block text-black text-lg font-semibold tracking-[-1px] absolute top-2 left-3 z-10">
            Physical Therapy
          </div>
          <div className="bg-[rgba(0,255,162,1)] absolute z-10 flex min-h-[34px] items-center gap-[7px] justify-center w-[34px] h-[34px] py-[7px] rounded-[112px] right-[9px] top-[11px]" />
        </>
      )}
      
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
          <div className="text-gray-600 text-xs">
            {timeSchedule}
          </div>
        </div>
      </div>

      {/* Desktop layout - keep existing */}
      <div className="hidden sm:flex w-full flex-col">
        {/* Clinic info section */}
        <div className="self-stretch flex w-full gap-1.5 font-normal mb-1">
          <img
            src={clinicIcon}
            className="aspect-[1] object-contain w-6 shrink-0 rounded-[23px]"
            alt={`${clinicName} logo`}
          />
          <div className="flex flex-col items-stretch justify-center min-w-0 flex-1">
            <div className="text-black text-base truncate">
              {clinicName}
            </div>
            <div className="text-[rgba(98,98,98,1)] text-xs truncate">
              {address}
            </div>
          </div>
        </div>

        {/* Desktop layout - hidden on mobile */}
        <div className="hidden sm:flex w-16 sm:w-20 lg:w-[80px] max-w-full mt-1 mb-1 self-center">
          <div className="bg-[rgba(0,255,162,1)] flex w-full aspect-square items-center justify-center px-2 sm:px-3 lg:px-4 rounded-full">
            <img
              src={serviceIcon}
              className="aspect-[1] object-contain w-8 sm:w-10 lg:w-12 self-stretch my-auto"
              alt={serviceName}
            />
          </div>
        </div>
        
        <div className="hidden sm:flex flex-col items-center text-xs font-normal justify-center">
          <div className="text-black text-lg sm:text-xl tracking-[-0.4px] text-center min-h-[32px] sm:min-h-[40px] flex items-center px-1">
            {serviceName}
          </div>
          <div className="items-center border flex text-black font-medium text-center bg-neutral-50 mt-1 px-2 py-0.5 rounded-full border-solid border-[#E9EAEB]">
            <div className="text-xs leading-[18px] self-stretch my-auto">
              {specialty}
            </div>
          </div>
          <div className="text-[rgba(98,98,98,1)] mt-1 text-center min-h-[16px] flex items-center px-1 truncate w-full">
            {address}
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
