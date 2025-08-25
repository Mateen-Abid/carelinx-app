import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClinicClick = () => {
    if (location.pathname === '/') {
      // If on home page, scroll to clinic section
      const clinicSection = document.getElementById('clinic-section');
      clinicSection?.scrollIntoView({ behavior: 'smooth' });
    } else {
      // If on other pages, navigate to home page
      navigate('/');
    }
  };

  return (
    <header className="bg-[rgba(12,34,67,1)] w-full overflow-hidden">
      <div className="shadow-[0px_4px_40px_rgba(255,255,255,0.07)] flex min-h-[72px] w-full items-center gap-[40px_100px] text-white justify-between flex-wrap px-8 max-md:max-w-full max-md:px-5">
        <div className="self-stretch flex min-w-60 items-center gap-4 whitespace-nowrap flex-wrap my-auto max-md:max-w-full">
          <div className="self-stretch flex items-center gap-4 text-[26px] font-semibold text-center uppercase tracking-[-1.04px] w-[169px] my-auto">
            <div className="self-stretch flex w-[169px] items-center gap-4 justify-between my-auto">
              <img
                src="https://api.builder.io/api/v1/image/assets/TEMP/2489908460929fcfd1c2086f35e39627355f4bf9?placeholderIfAbsent=true"
                className="aspect-[1] object-contain w-10 self-stretch shrink-0 my-auto"
                alt="Carelinx Logo"
              />
              <div className="self-stretch my-auto">
                Carelinx
              </div>
            </div>
          </div>
          <nav className="self-stretch flex min-w-60 gap-[40px_44px] text-sm font-medium tracking-[-0.28px] leading-none my-auto py-5">
            <div 
              onClick={() => navigate('/')}
              className="flex items-center gap-1 px-2.5 py-[7px] rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div className="self-stretch my-auto">
                Home
              </div>
            </div>
            <div 
              onClick={handleClinicClick}
              className="flex items-center gap-1 px-2.5 py-[7px] rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div className="self-stretch my-auto">
                Clinic
              </div>
            </div>
            <div className="flex items-center gap-[9px] px-2.5 py-[7px] rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
              <div className="self-stretch my-auto">
                Booking
              </div>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-[7px] rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
              <div className="self-stretch my-auto">
                Profile
              </div>
            </div>
          </nav>
        </div>
        <div className="self-stretch flex items-center gap-4 text-sm font-normal tracking-[-0.28px] leading-none my-auto">
          <div className="self-stretch flex gap-[19px] my-auto pl-2.5 pr-[9px] pt-[27px] pb-7">
            <button className="hover:text-[rgba(0,255,162,1)] transition-colors">Log in</button>
          </div>
          <img
            src="https://api.builder.io/api/v1/image/assets/TEMP/6fbf8b00ccde8825b82a57c7f73178e32ef85faf?placeholderIfAbsent=true"
            className="aspect-[3.08] object-contain w-[126px] self-stretch shrink-0 my-auto rounded-[40px] cursor-pointer hover:opacity-80 transition-opacity"
            alt="User Profile"
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
