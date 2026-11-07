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
  changeAppLanguage,
  isRTLLanguage,
} from "../locales/i18n";
import { useSettingsStore, CurrencyCode } from "../store/settingsStore";
import {
  formatCurrency,
  formatNumber as formatCentralNumber,
  formatLocalizedDate,
  formatPlural,
  DateFormatStyle,
} from "../utils/formatters";

interface LanguageContextType {
  language: SupportedLanguage;
  isBengali: boolean;
  isRTL: boolean;
  supportedLanguages: LanguageInfo[];
  changeLanguage: (lng: SupportedLanguage) => Promise<void>;
  t: (key: string, defaultValueOrOptions?: any, options?: any) => string;
  formatPrice: (amount: number | string, currency?: CurrencyCode) => string;
  formatNumber: (value: number | string) => string;
  formatDate: (date: Date | string | number, style?: DateFormatStyle) => string;
  formatPlural: (count: number, key: string, fallback?: { one: string; other: string }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { language: storedLanguage, setLanguage: setStoredLanguage, currency: storedCurrency, isHydrated } =
    useSettingsStore();
  const { t: i18nTranslate } = useTranslation();
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

  // Subscribe to i18n languageChanged event
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      const typedLang = (lng || "en") as SupportedLanguage;
      setCurrentLanguage((prev) => (prev !== typedLang ? typedLang : prev));
      applyRTLDirection(typedLang);
    };

    i18n.on("languageChanged", handleLanguageChanged);
    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, []);

  const changeLanguage = useCallback(
    async (lng: SupportedLanguage) => {
      try {
        await changeAppLanguage(lng);
        setCurrentLanguage(lng);
        setStoredLanguage(lng);
      } catch (err) {
        console.error("[LanguageContext] Failed to change language:", err);
      }
    },
    [setStoredLanguage]
  );

  const isRTL = useMemo(() => isRTLLanguage(currentLanguage), [currentLanguage]);
  const isBengali = useMemo(() => currentLanguage === "bn", [currentLanguage]);

  const customTranslate = useCallback(
    (key: string, defaultValueOrOptions?: any, options?: any): string => {
      if (!key) return "";
      if (typeof defaultValueOrOptions === "string") {
        return String(
          i18nTranslate(key, { defaultValue: defaultValueOrOptions, ...options })
        );
      }
      return String(i18nTranslate(key, defaultValueOrOptions));
    },
    [i18nTranslate]
  );

  const formatPrice = useCallback(
    (amount: number | string, currency?: CurrencyCode): string => {
      const activeCurrency = currency || storedCurrency || "BDT";
      return formatCurrency(amount, activeCurrency, {
        locale: currentLanguage,
      });
    },
    [storedCurrency, currentLanguage]
  );

  const formatNumber = useCallback(
    (value: number | string): string => {
      return formatCentralNumber(value, {
        locale: currentLanguage,
      });
    },
    [currentLanguage]
  );

  const formatDate = useCallback(
    (date: Date | string | number, style?: DateFormatStyle): string => {
      return formatLocalizedDate(date, style || "medium", currentLanguage);
    },
    [currentLanguage]
  );

  const formatPluralCount = useCallback(
    (count: number, key: string, fallback?: { one: string; other: string }): string => {
      return formatPlural(count, key, { locale: currentLanguage, fallback });
    },
    [currentLanguage]
  );

  const value = useMemo(
    () => ({
      language: currentLanguage,
      isBengali,
      isRTL,
      supportedLanguages: SUPPORTED_LANGUAGES,
      changeLanguage,
      t: customTranslate,
      formatPrice,
      formatNumber,
      formatDate,
      formatPlural: formatPluralCount,
    }),
    [
      currentLanguage,
      isBengali,
      isRTL,
      changeLanguage,
      customTranslate,
      formatPrice,
      formatNumber,
      formatDate,
      formatPluralCount,
    ]
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
