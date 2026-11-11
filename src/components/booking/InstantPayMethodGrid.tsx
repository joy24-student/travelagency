import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../theme";

export interface PaymentMethodOption {
  id: string;
  name: string;
  iconType: "ionicons" | "material";
  iconName: any;
  brandColor: string;
  badge?: string;
}

export const POPULAR_PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: "bkash",
    name: "bKash",
    iconType: "material",
    iconName: "cellphone-wireless",
    brandColor: "#D12053",
    badge: "Instant",
  },
  {
    id: "nagad",
    name: "Nagad",
    iconType: "material",
    iconName: "flash",
    brandColor: "#F7941D",
    badge: "0% Fee",
  },
  {
    id: "upay",
    name: "Upay",
    iconType: "material",
    iconName: "wallet-outline",
    brandColor: "#0099FF",
  },
  {
    id: "cards",
    name: "Debit/Credit Card",
    iconType: "ionicons",
    iconName: "card-outline",
    brandColor: "#1A1F71",
  },
];

export interface InstantPayMethodGridProps {
  selectedMethod: string;
  onSelectMethod: (methodId: string) => void;
  title?: string;
}

export const InstantPayMethodGrid: React.FC<InstantPayMethodGridProps> = ({
  selectedMethod,
  onSelectMethod,
  title = "Pay by any App",
}) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <View style={styles.grid}>
        {POPULAR_PAYMENT_METHODS.map((method) => {
          const isSelected = selectedMethod === method.id;

          return (
            <Pressable
              key={method.id}
              style={[
                styles.methodCard,
                {
                  backgroundColor: isDark ? colors.card : "#FFFFFF",
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
              onPress={() => {
                if (Platform.OS !== "web") {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                }
                onSelectMethod(method.id);
              }}
            >
              {method.badge && (
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: method.brandColor + "20" },
                  ]}
                >
                  <Text
                    style={[styles.badgeText, { color: method.brandColor }]}
                  >
                    {method.badge}
                  </Text>
                </View>
              )}

              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: method.brandColor + "15" },
                ]}
              >
                {method.iconType === "ionicons" ? (
                  <Ionicons
                    name={method.iconName}
                    size={22}
                    color={method.brandColor}
                  />
                ) : (
                  <MaterialCommunityIcons
                    name={method.iconName}
                    size={22}
                    color={method.brandColor}
                  />
                )}
              </View>

              <Text
                style={[
                  styles.methodName,
                  {
                    color: isSelected ? colors.primary : colors.text,
                    fontWeight: isSelected ? "700" : "500",
                  },
                ]}
                numberOfLines={1}
              >
                {method.name}
              </Text>

              {isSelected && (
                <View
                  style={[
                    styles.checkBadge,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  methodCard: {
    flex: 1,
    minWidth: "45%",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "700",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  methodName: {
    fontSize: 13,
  },
  checkBadge: {
    position: "absolute",
    top: 6,
    left: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default InstantPayMethodGrid;
