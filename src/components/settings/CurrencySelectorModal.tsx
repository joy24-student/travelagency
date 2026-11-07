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
import { useSettingsStore, CurrencyCode } from "../../store/settingsStore";
import {
  CURRENCY_METADATA,
  CurrencyMetadata,
  formatPrice,
} from "../../utils/currency";

interface CurrencySelectorModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CurrencySelectorModal: React.FC<CurrencySelectorModalProps> = ({
  visible,
  onClose,
}) => {
  const { currency, setCurrency } = useSettingsStore();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const hapticEnabled = useSettingsStore(
    (state) => state.accessibility.hapticFeedbackEnabled
  );
  const [searchQuery, setSearchQuery] = useState("");

  const currencies = Object.values(CURRENCY_METADATA);

  const filteredCurrencies = currencies.filter(
    (c) =>
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.nativeName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (code: CurrencyCode) => {
    if (hapticEnabled && Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {}
      );
    }
    setCurrency(code);
    onClose();
  };

  const renderItem = ({ item }: { item: CurrencyMetadata }) => {
    const isSelected = item.code === currency;
    const exampleValue = formatPrice(1000, item.code);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleSelect(item.code)}
        style={[
          styles.currencyRow,
          {
            backgroundColor: isSelected
              ? colors.primary + "15"
              : "transparent",
            borderColor: isSelected ? colors.primary : colors.border,
          },
        ]}
      >
        <View style={styles.leftInfo}>
          <View
            style={[
              styles.symbolBadge,
              {
                backgroundColor: isSelected
                  ? colors.primary
                  : isDark
                  ? "#1e293b"
                  : "#f1f5f9",
              },
            ]}
          >
            <Text
              style={[
                styles.symbolText,
                { color: isSelected ? "#ffffff" : colors.text },
              ]}
            >
              {item.symbol}
            </Text>
          </View>
          <View style={styles.detailsBlock}>
            <View style={styles.codeRow}>
              <Text style={styles.flag}>{item.flag}</Text>
              <Text
                style={[
                  styles.currencyCode,
                  { color: isSelected ? colors.primary : colors.text },
                ]}
              >
                {item.code}
              </Text>
            </View>
            <Text style={[styles.currencyName, { color: colors.subtext }]}>
              {item.name}
            </Text>
          </View>
        </View>

        <View style={styles.rightInfo}>
          <Text style={[styles.exampleText, { color: colors.subtext }]}>
            ৳1,000 ≈ {exampleValue}
          </Text>
          {isSelected && (
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={colors.primary}
              style={{ marginStart: 6 }}
            />
          )}
        </View>
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
                {t("selectCurrency")}
              </Text>
              <Text style={[styles.subtitle, { color: colors.subtext }]}>
                Live Central Bank Arbitrage
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

          {/* Currency List */}
          <FlatList
            data={filteredCurrencies}
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
    ...(Platform.OS === "web" ? { boxShadow: "0px 10px 20px rgba(15, 23, 42, 0.25)" } : {}),
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
    marginStart: 8,
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 8,
  },
  currencyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  leftInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  symbolBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginEnd: 12,
  },
  symbolText: {
    fontSize: 18,
    fontWeight: "700",
  },
  detailsBlock: {
    justifyContent: "center",
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  flag: {
    fontSize: 16,
    marginEnd: 6,
  },
  currencyCode: {
    fontSize: 15,
    fontWeight: "700",
  },
  currencyName: {
    fontSize: 12,
    marginTop: 2,
  },
  rightInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  exampleText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
