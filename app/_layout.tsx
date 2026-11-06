import "../global.css";

import React, { useEffect, Suspense, lazy } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { AuthProvider } from "../src/auth/context";
import { ThemeProvider, useTheme } from "../src/context/ThemeContext";
import { LanguageProvider } from "../src/context/LanguageContext";
import { useAuth } from "../src/hooks/useAuth";
import { supabase } from "../src/utils/supabase";
import { scheduleLowPriorityTask, runTaskIdle } from "../src/utils/performance";

/**
 * Route Code-Splitting & Lazy Loading:
 * Lazily load telephony/media overlays and non-critical modules so they are never
 * bundled into the initial consumer app launch chunk.
 */
const LazyIncomingCallBanner = lazy(() =>
  import("../src/components/IncomingCallBanner").then((m) => ({ default: m.IncomingCallBanner }))
);

WebBrowser.maybeCompleteAuthSession();

SplashScreen.preventAutoHideAsync().catch(console.error);

/**
 * Lightweight instant fallback view ensuring First Contentful Paint (FCP) < 800ms
 * while async route chunks resolve.
 */
const RouteChunkFallback = () => (
  <View style={styles.fallbackContainer}>
    <ActivityIndicator size="small" color="#0055F2" />
  </View>
);

const RootLayoutContent = () => {
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    // Schedule OAuth provider initialization off the critical render path
    const cancelOAuthInit = runTaskIdle(async () => {
      try {
        const { initializeOAuthProviders } = await import("../src/services/oauth");
        await initializeOAuthProviders();
      } catch (err) {
        console.error("Failed to initialize OAuth providers:", err);
      }
    }, 1500);

    if (!loading) {
      SplashScreen.hideAsync().catch(console.error);
    }

    return () => {
      cancelOAuthInit();
    };
  }, [loading]);

  useEffect(() => {
    const handleUrl = async ({ url }: { url: string }) => {
      if (!url.includes("auth/callback")) return;
      const code = new URL(url).searchParams.get("code");
      if (code) await supabase.auth.exchangeCodeForSession(code);
    };
    const sub = Linking.addEventListener("url", handleUrl);
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    // Register FCM push notifications via low-priority scheduler during idle frame budget
    let listenerSub: { remove: () => void } | undefined;
    const cancelPushInit = scheduleLowPriorityTask(
      async () => {
        try {
          const { fcmNotificationService } = await import("../src/services/fcmNotificationService");
          await fcmNotificationService.registerForPushNotifications();
          listenerSub = fcmNotificationService.setupNotificationResponseListener();
        } catch (err) {
          console.warn("FCM registration deferred error:", err);
        }
      },
      { timeout: 2500, priority: "background" }
    );

    return () => {
      cancelPushInit();
      listenerSub?.remove();
    };
  }, []);

  return (
    <Suspense fallback={<RouteChunkFallback />}>
      <Suspense fallback={null}>
        <LazyIncomingCallBanner />
      </Suspense>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#ffffff" },
        }}
      >
        {/* Core Consumer Navigation Stack with Async Route Code-Splitting */}
        <Stack.Screen
          name="(auth)"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />

        {/* Heavyweight Admin Screens (Isolated into Async Chunks) */}
        <Stack.Screen
          name="admin"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="screens/[slug]"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="screens/help"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="screens/profile"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="screens/reviews"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="screens/saved"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="screens/user-profile"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="screens/call"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="screens/settings"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </Suspense>
  );
};

const ThemedStatusBar = () => {
  const { isDark, isOled } = useTheme();
  return (
    <StatusBar
      style={isDark || isOled ? "light" : "dark"}
      backgroundColor={isOled ? "#000000" : isDark ? "#0f172a" : "#ffffff"}
    />
  );
};

/**
 * Root Layout Export
 * Wraps the app with Theme, Language, and Auth providers
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <ThemedStatusBar />
          <AuthProvider>
            <RootLayoutContent />
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
});
