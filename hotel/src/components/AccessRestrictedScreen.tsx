import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useHotelRBAC } from "../context/HotelRBACContext";

export function AccessRestrictedScreen({
  moduleName,
  requiredRole = "General Manager",
  onGoBack,
}: {
  moduleName: string;
  requiredRole?: string;
  onGoBack: () => void;
}) {
  const { roleMeta } = useHotelRBAC();

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <MaterialIcons name="security" size={48} color="#ef4444" />
      </View>
      <Text style={styles.title}>Access Restricted</Text>
      <Text style={styles.subtitle}>
        Module: <Text style={{ color: "#ffffff", fontWeight: "700" }}>{moduleName}</Text>
      </Text>
      <Text style={styles.message}>
        Your current staff persona ({roleMeta.label}) does not hold the necessary security clearance to inspect or modify {moduleName}. Requires: {requiredRole}.
      </Text>

      <TouchableOpacity style={styles.button} onPress={onGoBack}>
        <MaterialIcons name="arrow-back" size={18} color="#ffffff" />
        <Text style={styles.buttonText}>Return to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b1326",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: "#94a3b8",
    marginBottom: 12,
  },
  message: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 24,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#4f46e5",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
});
