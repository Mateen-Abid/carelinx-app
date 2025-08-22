import React from 'react';

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
  return (
    <article className={`bg-white overflow-hidden flex-1 min-w-[222px] max-w-[222px] h-[380px] flex flex-col px-[18px] py-[23px] rounded-[18px] ${isSpecial ? 'relative' : ''}`}>
      {isSpecial && (
        <>
          <div className="text-black text-lg font-semibold tracking-[-1px] z-0">
            Physical Therapy
          </div>
          <div className="bg-[rgba(0,255,162,1)] absolute z-0 flex min-h-[34px] items-center gap-[7px] justify-center w-[34px] h-[34px] py-[7px] rounded-[112px] right-[9px] top-[11px]" />
        </>
      )}
      
      <div className={`w-full flex flex-col flex-1 ${isSpecial ? 'mt-7 z-0' : ''}`}>
        <div className="flex w-full flex-col items-center flex-1">
          <div className="self-stretch flex w-full gap-1.5 font-normal">
            <img
              src={clinicIcon}
              className="aspect-[1] object-contain w-6 shrink-0 rounded-[23px]"
              alt={`${clinicName} logo`}
            />
            <div className="flex flex-col items-stretch justify-center w-[129px]">
              <div className="text-black text-base">
                {clinicName}
              </div>
              <div className="text-[rgba(40,40,40,1)] text-xs">
                {address}
              </div>
            </div>
          </div>
          
          <div className="flex w-[102px] max-w-full gap-[-76px] mt-3.5 mb-3.5">
            <div className="bg-[rgba(0,255,162,1)] flex w-[102px] items-center gap-5 justify-center h-[102px] px-5 rounded-[337px]">
              <img
                src={serviceIcon}
                className="aspect-[1] object-contain w-[62px] self-stretch my-auto"
                alt={serviceName}
              />
            </div>
          </div>
          
          <div className="flex flex-col items-center text-xs font-normal justify-center flex-1">
            <div className="text-black text-xl tracking-[-0.4px] text-center min-h-[24px] flex items-center">
              {serviceName}
            </div>
            <div className="items-center border flex text-black font-medium whitespace-nowrap text-center bg-neutral-50 mt-1 px-2 py-0.5 rounded-full border-solid border-[#E9EAEB]">
              <div className="text-xs leading-[18px] self-stretch my-auto">
                {specialty}
              </div>
            </div>
            <div className="text-[rgba(98,98,98,1)] mt-1 text-center min-h-[16px]">
              {address}
            </div>
          </div>
        </div>
        
        <div className="w-full text-xs mt-auto">
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
      </div>
      
      <button className="bg-[rgba(14,36,68,1)] flex min-h-[42px] w-full items-center text-sm text-white font-normal text-center tracking-[-0.28px] leading-none justify-center mt-4 px-[18px] py-[13px] rounded-[40px] hover:bg-[rgba(14,36,68,0.9)] transition-colors">
        <span className="self-stretch my-auto">
          Book Appointment
        </span>
      </button>
    </article>
  );
};

export default ServiceCard;
