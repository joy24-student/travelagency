import React, { createContext, useContext, useState, ReactNode } from 'react';
import i18n, { applyRTLDirection, isRTLLanguage } from '../locales/i18n';

interface LanguageContextType {
  language: string;
  isRTL: boolean;
  changeLanguage: (lng: string) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<string>(i18n.language || 'en');
  const isRTL = isRTLLanguage(language);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    applyRTLDirection(lng);
    setLanguage(lng);
  };

  return (
    <LanguageContext.Provider value={{ language, isRTL, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};
