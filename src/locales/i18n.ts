import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import { I18nManager, Platform } from "react-native";
import en from "./en/translation.json";
import bn from "./bn/translation.json";
import ar from "./ar/translation.json";
import hi from "./hi/translation.json";

export type SupportedLanguage = "en" | "bn" | "ar" | "hi";

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  isRTL: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  {
    code: "en",
    name: "English",
    nativeName: "English (US)",
    flag: "🇺🇸",
    isRTL: false,
  },
  {
    code: "bn",
    name: "Bengali",
    nativeName: "বাংলা",
    flag: "🇧🇩",
    isRTL: false,
  },
  {
    code: "ar",
    name: "Arabic",
    nativeName: "العربية",
    flag: "🇸🇦",
    isRTL: true,
  },
  {
    code: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
    flag: "🇮🇳",
    isRTL: false,
  },
];

export const isRTLLanguage = (langCode: string): boolean => {
  return langCode === "ar";
};

export const applyRTLDirection = (langCode: string): boolean => {
  const rtl = isRTLLanguage(langCode);
  let directionChanged = false;

  if (Platform.OS === "web") {
    if (typeof document !== "undefined") {
      const prevDir = document.documentElement.dir;
      const newDir = rtl ? "rtl" : "ltr";
      document.documentElement.dir = newDir;
      document.documentElement.lang = langCode;
      if (rtl) {
        document.documentElement.classList.add("rtl");
      } else {
        document.documentElement.classList.remove("rtl");
      }
      directionChanged = prevDir !== newDir;
    }
  } else {
    if (I18nManager.isRTL !== rtl) {
      directionChanged = true;
      I18nManager.allowRTL(rtl);
      I18nManager.forceRTL(rtl);
    }
  }

  return directionChanged;
};

/**
 * Switch language and safely apply RTL configuration with auto-reload if native direction flips
 */
export const changeAppLanguage = async (
  langCode: SupportedLanguage,
  options: { reloadOnRTLChange?: boolean } = {}
): Promise<boolean> => {
  await i18n.changeLanguage(langCode);
  const directionChanged = applyRTLDirection(langCode);

  if (directionChanged && options.reloadOnRTLChange !== false && Platform.OS !== "web") {
    try {
      // Dynamic import expo-updates if available
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Updates = require("expo-updates");
      if (Updates && typeof Updates.reloadAsync === "function") {
        setTimeout(async () => {
          try {
            await Updates.reloadAsync();
          } catch (e) {
            console.log("[i18n] reloadAsync skipped:", e);
          }
        }, 150);
      }
    } catch {
      // Ignore if updates not installed
    }
  }

  return directionChanged;
};

// Detect device language on fresh install
export const getDeviceLanguage = (): SupportedLanguage => {
  try {
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      const code = locales[0].languageCode?.toLowerCase();
      if (code === "bn") return "bn";
      if (code === "ar") return "ar";
      if (code === "hi") return "hi";
      if (code === "en") return "en";
    }
  } catch (err) {
    console.warn("[i18n] Localization detection fallback to en:", err);
  }
  return "en";
};

const initialLanguage = getDeviceLanguage();
applyRTLDirection(initialLanguage);

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      bn: { translation: bn },
      ar: { translation: ar },
      hi: { translation: hi },
    },
    lng: initialLanguage,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: "v3",
    react: {
      useSuspense: false,
    },
  });

export default i18n;
