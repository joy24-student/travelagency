import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "../../src/hooks/useAuth";

export default function AdminLayout() {
  const router = useRouter();
  const { user, isAuthenticated, loading, getUserRole } = useAuth();
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function verifyAdminAccess() {
      if (loading) return;

      if (!isAuthenticated || !user) {
        if (isMounted) {
          setIsVerifyingAdmin(false);
          setIsAdmin(false);
          router.replace("/(auth)/login");
        }
        return;
      }

      try {
        const role = await getUserRole();
        if (!isMounted) return;

        if (role === "admin") {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (err) {
        console.error("Admin verification failed:", err);
        if (isMounted) setIsAdmin(false);
      } finally {
        if (isMounted) setIsVerifyingAdmin(false);
      }
    }

    verifyAdminAccess();

    return () => {
      isMounted = false;
    };
  }, [user, loading, isAuthenticated, getUserRole, router]);

  // Loading state while checking authentication and role
  if (loading || isVerifyingAdmin) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.loadingText}>Verifying administrator credentials...</Text>
      </View>
    );
  }

  // Access denied screen if user is not authorized
  if (!isAuthenticated || !isAdmin) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.deniedCard}>
          <Text style={styles.deniedBadge}>RESTRICTED ACCESS</Text>
          <Text style={styles.deniedTitle}>Admin Privileges Required</Text>
          <Text style={styles.deniedMessage}>
            Your account does not possess verified administrator status. All unauthorized attempts are logged for security compliance.
          </Text>
          <TouchableOpacity
            style={styles.returnButton}
            onPress={() => router.replace("/(tabs)")}
            activeOpacity={0.8}
          >
            <Text style={styles.returnButtonText}>Return to Traveler Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[slug]" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "500",
  },
  deniedCard: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 24,
    maxWidth: 420,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  deniedBadge: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  deniedTitle: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  deniedMessage: {
    color: "#94a3b8",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
  },
  returnButton: {
    backgroundColor: "#0284c7",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  returnButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
});
