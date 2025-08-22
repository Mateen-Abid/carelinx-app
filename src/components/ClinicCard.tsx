import React from 'react';

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
  doctorAvatars?: string;
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
  doctorAvatars,
  daysIcon,
  timingIcon,
  isCallOnly = false,
  phoneNumber
}) => {
  return (
    <article className="bg-white flex min-w-80 flex-col h-[320px] overflow-hidden items-stretch flex-1 shrink basis-[0%] my-auto p-3.5 rounded-[14px] max-md:max-w-full">
      <div className="flex w-full items-center gap-[40px_100px] justify-between py-[7px]">
        <div className="self-stretch flex items-center gap-1.5 font-normal my-auto">
          <img
            src={logo}
            className="aspect-[1] object-contain w-[34px] self-stretch shrink-0 my-auto rounded-[32px]"
            alt={`${name} logo`}
          />
          <div className="self-stretch flex flex-col items-stretch justify-center my-auto">
            <div className="text-black text-base">
              {name}
            </div>
            <div className="text-[rgba(40,40,40,1)] text-xs">
              {address}
            </div>
          </div>
        </div>
        <div className="items-center border shadow-[0_1px_2px_0_rgba(10,13,18,0.05)] self-stretch flex text-xs text-[#414651] font-medium text-center bg-white my-auto px-1.5 py-0.5 rounded-md border-solid border-[#D5D7DA]">
          <div className="text-[#414651] text-xs leading-[18px] self-stretch my-auto">
            {type}
          </div>
        </div>
      </div>
      
      <div className="w-full text-xs font-normal mt-2 flex-1">
        <div className="text-[rgba(40,40,40,1)] mb-2">
          {services.length > 0 ? (type === 'Hospital' ? 'Departments' : 'Services') : 'Specialties'}
        </div>
        <div className="flex w-full gap-1 text-black flex-wrap">
          {services.slice(0, 5).map((service, index) => (
            <div key={index} className="bg-[rgba(243,243,243,1)] flex items-center gap-1.5 justify-center px-2.5 py-1.5 rounded-[99px]">
              {service.icon && (
                <img
                  src={service.icon}
                  className="aspect-[1] object-contain w-[18px] self-stretch shrink-0 my-auto"
                  alt=""
                />
              )}
              <div className="self-stretch my-auto text-xs">
                {service.name}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex w-full items-center gap-[19px] mt-2 mb-2">
        <div className="self-stretch flex gap-2 w-[152px] my-auto">
          {doctorAvatars && (
            <img
              src={doctorAvatars}
              className="aspect-[4.74] object-contain w-[152px] gap-[-8px]"
              alt="Doctor avatars"
            />
          )}
        </div>
        <div className="text-[rgba(40,40,40,1)] text-xs font-normal self-stretch my-auto">
          {doctorCount}
        </div>
      </div>
      
      <div className="flex items-center gap-2.5 text-xs text-[rgba(40,40,40,1)] font-normal mb-3">
        <div className="self-stretch my-auto">Days Open</div>
        <div className="items-center border self-stretch flex gap-0.5 text-black font-medium text-center bg-neutral-50 my-auto pl-1.5 pr-2 py-0.5 rounded-full border-solid border-[#E9EAEB]">
          <img
            src={daysIcon}
            className="aspect-[1] object-contain w-3 self-stretch shrink-0 my-auto"
            alt="Calendar icon"
          />
          <div className="text-xs leading-[18px] self-stretch my-auto">
            {daysOpen}
          </div>
        </div>
        <div className="self-stretch my-auto">Timing</div>
        <div className="items-center border self-stretch flex gap-0.5 text-black font-medium text-center bg-neutral-50 my-auto pl-1.5 pr-2 py-0.5 rounded-full border-solid border-[#E9EAEB]">
          <img
            src={timingIcon}
            className="aspect-[1] object-contain w-3 self-stretch shrink-0 my-auto"
            alt="Clock icon"
          />
          <div className="text-xs leading-[18px] self-stretch my-auto">
            {timing}
          </div>
        </div>
      </div>
      
      {isCallOnly ? (
        <div className="flex items-center gap-3 text-xs justify-center">
          <div className="text-[rgba(207,42,42,1)] font-normal self-stretch my-auto">
            Call Know for an Appoinment
          </div>
          <div className="text-[rgba(40,40,40,1)] font-medium self-stretch my-auto">
            {phoneNumber}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm font-normal text-center tracking-[-0.28px] leading-none w-full">
          <button className="bg-[rgba(0,255,162,1)] self-stretch flex min-h-[42px] items-center text-[rgba(12,34,67,1)] justify-center my-auto px-[18px] py-[13px] rounded-[40px] hover:bg-[rgba(0,255,162,0.9)] transition-colors">
            <span className="self-stretch my-auto">View Details</span>
          </button>
          <button className="bg-[rgba(14,36,68,1)] self-stretch flex min-h-[42px] items-center text-white justify-center my-auto px-[18px] py-[13px] rounded-[40px] hover:bg-[rgba(14,36,68,0.9)] transition-colors">
            <span className="self-stretch my-auto">Book Appointment</span>
          </button>
        </div>
      )}
    </article>
  );
};

export default ClinicCard;
