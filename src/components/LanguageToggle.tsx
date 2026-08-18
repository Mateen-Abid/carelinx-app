import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface LanguageToggleProps {
  className?: string;
  variant?: 'onDark' | 'onLight';
}

const LanguageToggle: React.FC<LanguageToggleProps> = ({ className, variant = 'onDark' }) => {
  const { i18n, t } = useTranslation();
  const isArabic = i18n.language === 'ar' || i18n.language.startsWith('ar');

  return (
    <button
      type="button"
      onClick={() => i18n.changeLanguage(isArabic ? 'en' : 'ar')}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        variant === 'onLight'
          ? 'border-gray-300 bg-white text-gray-800 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700'
          : 'border-white/20 text-white hover:bg-white/10',
        className
      )}
      aria-label={t('Language')}
    >
      <span>{isArabic ? t('English') : t('Arabic')}</span>
    </button>
  );
};

export default LanguageToggle;
