import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SearchFieldProps {
  icon?: string;
  label: string;
  value: string;
  onPress?: () => void;
  isBorder?: boolean;
}

export function SearchField({
  icon,
  label,
  value,
  onPress,
  isBorder = true,
}: SearchFieldProps) {
  return (
    <>
      <Pressable
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        accessibilityHint="Tap to edit search field"
        style={styles.container}
        onPress={onPress}
      >
        {icon && (
          <View accessible={false} importantForAccessibility="no" style={styles.iconContainer}>
            <Ionicons name={icon as any} size={20} color="#6b7280" />
          </View>
        )}
        <View style={styles.content}>
          <Text allowFontScaling={true} maxFontSizeMultiplier={1.4} style={styles.label}>{label}</Text>
          <Text allowFontScaling={true} maxFontSizeMultiplier={1.4} style={styles.value}>{value}</Text>
        </View>
      </Pressable>
      {isBorder && <View style={styles.border} />}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    marginEnd: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
    marginBottom: 2,
  },
  value: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  border: {
    height: 1,
    backgroundColor: "#e5e7eb",
  },
});
