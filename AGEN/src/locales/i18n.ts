import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en/translation.json';
import bn from './bn/translation.json';

// Detect device language
const getDeviceLanguage = () => {
  // In a real implementation, you would detect the device language
  // For now, we'll default to English and allow manual switching
  return 'en'; // Default to English
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: en,
      },
      bn: {
        translation: bn,
      },
    },
    lng: getDeviceLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v3',
  });

export default i18n;