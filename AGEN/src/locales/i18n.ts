import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import en from './en/translation.json';
import bn from './bn/translation.json';
import ar from './ar/translation.json';
import hi from './hi/translation.json';

export const RTL_LANGUAGES = ['ar'];

export function isRTLLanguage(lang: string): boolean {
  return RTL_LANGUAGES.includes((lang || '').toLowerCase().slice(0, 2));
}

export function applyRTLDirection(lang: string): boolean {
  const shouldBeRTL = isRTLLanguage(lang);
  const currentRTL = I18nManager.isRTL;
  if (currentRTL !== shouldBeRTL) {
    I18nManager.allowRTL(shouldBeRTL);
    I18nManager.forceRTL(shouldBeRTL);
    return true;
  }
  return false;
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      bn: { translation: bn },
      ar: { translation: ar },
      hi: { translation: hi },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v3',
  });

export default i18n;
