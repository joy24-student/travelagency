import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import i18n, {
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
  LanguageInfo,
  applyRTLDirection,
  isRTLLanguage,
} from "../locales/i18n";
import { useSettingsStore } from "../store/settingsStore";

interface LanguageContextType {
  language: SupportedLanguage;
  isRTL: boolean;
  supportedLanguages: LanguageInfo[];
  changeLanguage: (lng: SupportedLanguage) => Promise<void>;
  t: (key: string, options?: any) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { language: storedLanguage, setLanguage: setStoredLanguage, isHydrated } =
    useSettingsStore();
  const { t } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(
    (storedLanguage as SupportedLanguage) || (i18n.language as SupportedLanguage) || "en"
  );

  // Sync state if store updates or hydrates
  useEffect(() => {
    if (isHydrated && storedLanguage && storedLanguage !== currentLanguage) {
      const lang = storedLanguage as SupportedLanguage;
      setCurrentLanguage(lang);
      i18n.changeLanguage(lang);
      applyRTLDirection(lang);
    }
  }, [isHydrated, storedLanguage]);

  const changeLanguage = useCallback(
    async (lng: SupportedLanguage) => {
      try {
        await i18n.changeLanguage(lng);
        applyRTLDirection(lng);
        setCurrentLanguage(lng);
        setStoredLanguage(lng);
      } catch (err) {
        console.error("[LanguageContext] Failed to change language:", err);
      }
    },
    [setStoredLanguage]
  );

  const isRTL = useMemo(() => isRTLLanguage(currentLanguage), [currentLanguage]);

  const value = useMemo(
    () => ({
      language: currentLanguage,
      isRTL,
      supportedLanguages: SUPPORTED_LANGUAGES,
      changeLanguage,
      t: (key: string, options?: any) => String(t(key, options)),
    }),
    [currentLanguage, isRTL, changeLanguage, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
