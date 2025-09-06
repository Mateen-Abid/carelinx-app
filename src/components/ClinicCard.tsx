import React from 'react';
import { useNavigate } from 'react-router-dom';

interface ClinicService {
  name: string;
  icon: string;
}

interface ClinicCardProps {
  name: string;
  address: string;
  type: string;
  services: ClinicService[];
  doctorCount: string;
  daysOpen: string;
  timing: string;
  logo: string;
  
  daysIcon: string;
  timingIcon: string;
  isCallOnly?: boolean;
  phoneNumber?: string;
}

const ClinicCard: React.FC<ClinicCardProps> = ({
  name,
  address,
  type,
  services,
  doctorCount,
  daysOpen,
  timing,
  logo,
  
  daysIcon,
  timingIcon,
  isCallOnly = false,
  phoneNumber
}) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    // Convert clinic name to a URL-friendly slug
    const clinicSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    navigate(`/clinic/${clinicSlug}`);
  };

  return (
    <article 
      onClick={handleCardClick}
      className="bg-white flex w-full flex-col h-[200px] sm:h-[240px] overflow-hidden items-stretch p-1.5 sm:p-2 rounded-[14px] cursor-pointer hover:shadow-lg transition-shadow duration-200"
    >
      <div className="flex w-full items-center justify-between py-1 gap-2">
        <div className="flex items-center gap-1.5 font-normal min-w-0 flex-1">
          <img
            src={logo}
            className="aspect-[1] object-contain w-8 sm:w-[34px] shrink-0 rounded-[32px]"
            alt={`${name} logo`}
          />
          <div className="flex flex-col items-stretch justify-center min-w-0 flex-1">
            <div className="text-black text-sm sm:text-base truncate">
              {name}
            </div>
            <div className="text-[rgba(40,40,40,1)] text-xs truncate">
              {address}
            </div>
          </div>
        </div>
        <div className="items-center border shadow-[0_1px_2px_0_rgba(10,13,18,0.05)] flex text-xs text-[#414651] font-medium text-center bg-white px-1.5 py-0.5 rounded-md border-solid border-[#D5D7DA] shrink-0">
          <div className="text-[#414651] text-xs leading-[18px] whitespace-nowrap">
            {type}
          </div>
        </div>
      </div>
      
      <div className="w-full text-xs font-normal mt-0 flex-1">
        <div className="text-[rgba(40,40,40,1)] mb-0.5">
          {services.length > 0 ? (type === 'Hospital' ? 'Departments' : 'Services') : 'Specialties'}
        </div>
        <div className="flex w-full gap-1 text-black flex-wrap">
          {services.slice(0, 5).map((service, index) => (
            <div key={index} className="bg-[rgba(243,243,243,1)] flex items-center gap-1 sm:gap-1.5 justify-center px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-[99px]">
              {service.icon && (
                <img
                  src={service.icon}
                  className="aspect-[1] object-contain w-4 sm:w-[18px] shrink-0"
                  alt=""
                />
              )}
              <div className="text-xs truncate max-w-20 sm:max-w-none">
                {service.name}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex w-full items-center justify-end gap-2 mt-0.5 mb-0.5">
        <div className="text-[rgba(40,40,40,1)] text-xs font-normal">
          {doctorCount}
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs text-[rgba(40,40,40,1)] font-normal">
        <div className="flex items-center gap-2">
          <div className="shrink-0">Days Open</div>
          <div className="items-center border flex gap-0.5 text-black font-medium text-center bg-neutral-50 pl-1.5 pr-2 py-0.5 rounded-full border-solid border-[#E9EAEB]">
            <img
              src={daysIcon}
              className="aspect-[1] object-contain w-3 shrink-0"
              alt="Calendar icon"
            />
            <div className="text-xs leading-[18px] whitespace-nowrap">
              {daysOpen}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="shrink-0">Timing</div>
          <div className="items-center border flex gap-0.5 text-black font-medium text-center bg-neutral-50 pl-1.5 pr-2 py-0.5 rounded-full border-solid border-[#E9EAEB]">
            <img
              src={timingIcon}
              className="aspect-[1] object-contain w-3 shrink-0"
              alt="Clock icon"
            />
            <div className="text-xs leading-[18px] whitespace-nowrap">
              {timing}
            </div>
          </div>
        </div>
      </div>

      {isCallOnly && (
        <div className="flex items-center gap-3 text-xs justify-center mt-3">
          <div className="text-[rgba(207,42,42,1)] font-normal self-stretch my-auto">
            Call Know for an Appointment
          </div>
          <div className="text-[rgba(40,40,40,1)] font-medium self-stretch my-auto">
            {phoneNumber}
          </div>
        </div>
      )}
    </article>
  );
};

export default ClinicCard;
