import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { localizedStoredText } from '@/utils/localizedContent';

interface ClinicService {
  name: string;
  icon: string;
}

interface ClinicCardProps {
  id?: string; // Add clinic ID
  name: string;
  nameAr?: string | null;
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
  onBookingClick?: () => void;
  hasSelectedService?: boolean; // Indicates if a service is selected
  startingPrice?: string;
}

const ClinicCard: React.FC<ClinicCardProps> = ({
  id,
  name,
  nameAr,
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
  phoneNumber,
  onBookingClick,
  hasSelectedService = false,
  startingPrice
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [logoError, setLogoError] = React.useState(false);
  const displayName = localizedStoredText(name, nameAr, i18n.language);

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigation if booking button was clicked
    if ((e.target as HTMLElement).closest('.booking-button')) {
      return;
    }
    
    // If a service is selected and onBookingClick is provided, use that instead
    if (hasSelectedService && onBookingClick) {
      console.log('✅ Service selected, calling onBookingClick instead of navigating to ClinicDetails');
      onBookingClick();
      return;
    }
    
    // Otherwise, navigate to clinic details page
    // Use the clinic ID if available, otherwise fallback to name-based slug
    const from = `${location.pathname}${location.search}`;
    if (id) {
      navigate(`/clinic/${id}`, { state: { from } });
    } else {
      // Fallback: Convert clinic name to a URL-friendly slug
      const clinicSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
      navigate(`/clinic/${clinicSlug}`, { state: { from } });
    }
  };

  const handleBookingClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBookingClick) {
      onBookingClick();
    }
  };

  return (
    <article 
      onClick={handleCardClick}
      className="bg-white flex w-full flex-col min-h-[80px] sm:min-h-[100px] overflow-hidden items-stretch p-3 sm:p-4 rounded-[14px] cursor-pointer hover:shadow-lg transition-shadow duration-200"
    >
      <div className="flex w-full items-center gap-3">
        {!logoError && logo ? (
          <img
            src={logo}
            className="aspect-[1] object-contain w-8 sm:w-[34px] shrink-0 rounded-[32px]"
            alt={`${displayName} logo`}
            onError={() => setLogoError(true)}
          />
        ) : (
          <div className="aspect-[1] w-8 sm:w-[34px] shrink-0 rounded-[32px] bg-[#0C2243] flex items-center justify-center">
            <span className="text-[#00FFA2] text-sm sm:text-base font-bold">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="text-black text-sm sm:text-base font-medium truncate">
              {displayName}
            </div>
            {startingPrice ? (
              <span className="shrink-0 inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1 text-xs font-semibold">
                {t('Starting from')} {startingPrice}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <div className="bg-white text-gray-600 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 border border-gray-200">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="truncate">{address}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

export default ClinicCard;
