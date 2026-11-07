import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { useLanguage } from "../context/LanguageContext";

const LanguageSwitcher: React.FC = () => {
  const { language, changeLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const newLang = language === "en" ? "bn" : "en";
    changeLanguage(newLang);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={toggleLanguage}
        accessibilityRole="button"
        accessibilityLabel={language === "en" ? "Switch to Bengali" : "Switch to English"}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>
          {language === "en" ? "বাংলা 🇧🇩" : "English 🇺🇸"}
        </Text>
      </TouchableOpacity>
      <Text style={styles.text}>
        {language === "bn" ? "বর্তমান ভাষা: বাংলা" : "Current: English"}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  button: {
    backgroundColor: "#0055F2",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    marginEnd: 12,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  text: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
});

export default LanguageSwitcher;
