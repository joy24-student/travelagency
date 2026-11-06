import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLanguage } from "../../context/LanguageContext";
import { useTheme } from "../../context/ThemeContext";
import { useSettingsStore } from "../../store/settingsStore";
import { LanguageInfo, SupportedLanguage } from "../../locales/i18n";

interface LanguageSelectorModalProps {
  visible: boolean;
  onClose: () => void;
}

export const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({
  visible,
  onClose,
}) => {
  const { language, changeLanguage, supportedLanguages, t } = useLanguage();
  const { colors, isDark } = useTheme();
  const hapticEnabled = useSettingsStore(
    (state) => state.accessibility.hapticFeedbackEnabled
  );
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLanguages = supportedLanguages.filter(
    (lang) =>
      lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = async (langCode: SupportedLanguage) => {
    if (hapticEnabled && Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {}
      );
    }
    await changeLanguage(langCode);
    onClose();
  };

  const renderItem = ({ item }: { item: LanguageInfo }) => {
    const isSelected = item.code === language;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleSelect(item.code)}
        style={[
          styles.languageRow,
          {
            backgroundColor: isSelected
              ? colors.primary + "15"
              : "transparent",
            borderColor: isSelected ? colors.primary : colors.border,
          },
        ]}
      >
        <View style={styles.languageInfo}>
          <Text style={styles.flagText}>{item.flag}</Text>
          <View style={styles.nameBlock}>
            <Text
              style={[
                styles.nativeName,
                { color: isSelected ? colors.primary : colors.text },
              ]}
            >
              {item.nativeName}
            </Text>
            <Text style={[styles.englishName, { color: colors.subtext }]}>
              {item.name} {item.isRTL ? "• RTL" : ""}
            </Text>
          </View>
        </View>

        {isSelected ? (
          <View
            style={[
              styles.checkCircle,
              { backgroundColor: colors.primary },
            ]}
          >
            <Ionicons name="checkmark" size={16} color="#ffffff" />
          </View>
        ) : (
          <View
            style={[
              styles.unselectedCircle,
              { borderColor: colors.border },
            ]}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>
                {t("selectLanguage")}
              </Text>
              <Text style={[styles.subtitle, { color: colors.subtext }]}>
                {t("changeLanguage")}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeButton,
                { backgroundColor: isDark ? "#334155" : "#f1f5f9" },
              ]}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: isDark ? "#1e293b" : "#f8f9fa",
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="search" size={18} color={colors.subtext} />
            <TextInput
              placeholder={t("search")}
              placeholderTextColor={colors.subtext}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[styles.searchInput, { color: colors.text }]}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color={colors.subtext} />
              </TouchableOpacity>
            )}
          </View>

          {/* Language List */}
          <FlatList
            data={filteredLanguages}
            keyExtractor={(item) => item.code}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 420,
    maxHeight: 520,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 8,
  },
  languageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  languageInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  flagText: {
    fontSize: 26,
    marginRight: 12,
  },
  nameBlock: {
    justifyContent: "center",
  },
  nativeName: {
    fontSize: 15,
    fontWeight: "700",
  },
  englishName: {
    fontSize: 12,
    marginTop: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  unselectedCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
});
