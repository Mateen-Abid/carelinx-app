import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageToggle: React.FC = () => {
  const { i18n, t } = useTranslation();
  const isArabic = i18n.language === 'ar';

  return (
    <button
      onClick={() => i18n.changeLanguage(isArabic ? 'en' : 'ar')}
      className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 transition-colors"
      aria-label={t('Language')}
    >
      <span>{isArabic ? t('English') : t('Arabic')}</span>
    </button>
  );
};

export default LanguageToggle;

