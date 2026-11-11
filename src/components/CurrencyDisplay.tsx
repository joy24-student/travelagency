import React from "react";
import { Text, StyleSheet, StyleProp, TextStyle } from "react-native";
import { formatPrice } from "../utils/currency";
import { useSettingsStore, CurrencyCode } from "../store/settingsStore";
import { useLanguage } from "../context/LanguageContext";

interface CurrencyDisplayProps {
  amount: number | string;
  currency?: CurrencyCode;
  showSymbol?: boolean;
  useBengaliDigits?: boolean;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  amount,
  currency,
  showSymbol = true,
  useBengaliDigits,
  style,
  numberOfLines = 1,
}) => {
  const storeCurrency = useSettingsStore((s) => s.currency);
  const { language } = useLanguage();

  const activeCurrency = currency || storeCurrency || "BDT";
  const isBengali = useBengaliDigits ?? (language === "bn");

  const formattedAmount = formatPrice(amount, activeCurrency, {
    showSymbol,
    locale: language,
    useBengaliDigits: isBengali,
  });

  return (
    <Text
      numberOfLines={numberOfLines}
      style={[styles.text, style]}
    >
      {formattedAmount}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0F172A",
  },
});

export default CurrencyDisplay;
