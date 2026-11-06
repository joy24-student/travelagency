import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AdminPermission } from "./rbacTypes";
import { useRBAC } from "./RBACContext";

interface RBACGuardProps {
  permission?: AdminPermission;
  fallback?: React.ReactNode;
  mode?: "hide" | "disable" | "banner";
  children: React.ReactNode;
}

export const RBACGuard: React.FC<RBACGuardProps> = ({
  permission,
  fallback,
  mode = "hide",
  children,
}) => {
  const { hasPermission, role } = useRBAC();

  const isAuthorized = permission ? hasPermission(permission) : true;

  if (isAuthorized) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (mode === "hide") {
    return null;
  }

  if (mode === "banner") {
    return (
      <View style={styles.bannerContainer}>
        <MaterialCommunityIcons name="shield-lock-outline" size={24} color="#dc2626" />
        <View style={styles.bannerTextContainer}>
          <Text style={styles.bannerTitle}>Administrative Permission Required</Text>
          <Text style={styles.bannerDescription}>
            Your active role ({role}) does not hold the required privilege:{" "}
            <Text style={{ fontWeight: "700" }}>{permission}</Text>. Contact a Super Admin for access.
          </Text>
        </View>
      </View>
    );
  }

  // mode === "disable"
  return (
    <View style={styles.disabledContainer} pointerEvents="none">
      {children}
    </View>
  );
};

export const AccessDeniedScreen: React.FC<{
  tabName?: string;
  requiredRole?: string;
}> = ({ tabName, requiredRole }) => {
  const { role } = useRBAC();

  return (
    <View style={styles.deniedContainer}>
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons name="shield-alert" size={48} color="#ef4444" />
      </View>
      <Text style={styles.deniedTitle}>Access Restricted</Text>
      <Text style={styles.deniedSubtitle}>
        Module: <Text style={{ fontWeight: "700" }}>{tabName || "Restricted Section"}</Text>
      </Text>
      <Text style={styles.deniedMessage}>
        Your current administrative credential ({role.toUpperCase()}) does not possess the
        authorization matrix required to inspect or execute operations on this module.
        {requiredRole ? ` Requires role: ${requiredRole}.` : ""}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    marginHorizontal: 12,
    gap: 12,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#991b1b",
  },
  bannerDescription: {
    fontSize: 12,
    color: "#b91c1c",
    marginTop: 2,
  },
  disabledContainer: {
    opacity: 0.45,
  },
  deniedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: "#f8fafc",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  deniedTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 6,
  },
  deniedSubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 12,
  },
  deniedMessage: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 380,
  },
});
