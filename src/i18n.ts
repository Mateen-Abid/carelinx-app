import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en/common.json';
import ar from './locales/ar/common.json';

const getInitialLanguage = () => {
  const saved = localStorage.getItem('lang');
  return saved === 'ar' || saved === 'en' ? saved : 'en';
};

i18n.use(initReactI18next).init({
  resources: {
    en: { common: en },
    ar: { common: ar },
  },
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: {
    escapeValue: false,
  },
});

const applyDocumentDirection = (lng: string) => {
  document.documentElement.lang = lng;
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  localStorage.setItem('lang', lng);
};

applyDocumentDirection(i18n.language);
i18n.on('languageChanged', applyDocumentDirection);

export default i18n;

