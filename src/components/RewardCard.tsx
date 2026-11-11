import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface RewardCardProps {
  title: string;
  subtitle?: string;
  icon?: string;
  iconColor?: string;
  discount?: string;
  onPress?: () => void;
  style?: any;
}

export function RewardCard({
  title,
  subtitle,
  icon,
  iconColor = "#287dfa",
  discount,
  onPress,
  style,
}: RewardCardProps) {
  return (
    <Pressable style={[styles.container, style]} onPress={onPress}>
      <View style={styles.content}>
        {icon && (
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${iconColor}18` },
            ]}
          >
            <Ionicons name={icon as any} size={24} color={iconColor} />
          </View>
        )}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
      {discount && <Text style={styles.discount}>{discount}</Text>}
      <Ionicons name="chevron-forward" size={20} color="#e0e0ff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: "#9ca3af",
  },
  discount: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#287dfa",
    marginEnd: 8,
  },
});
