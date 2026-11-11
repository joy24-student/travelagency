import "../global.css";

import React, { useEffect, Suspense, lazy } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useFonts } from "expo-font";
import { AuthProvider } from "../src/auth/context";
import { NetworkProvider } from "../src/context/NetworkContext";
import { OfflineBanner } from "../src/components/common";
import { useAuthStore } from "../src/store/authStore";
import { ThemeProvider, useTheme } from "../src/theme";
import { LanguageProvider } from "../src/context/LanguageContext";
import { I18nextProvider } from "react-i18next";
import i18n from "../src/locales/i18n";
import { useAuth } from "../src/hooks/useAuth";
import { supabase } from "../src/utils/supabase";
import { scheduleLowPriorityTask, runTaskIdle } from "../src/utils/performance";
import { ErrorBoundary } from "../src/components/common/ErrorBoundaryView";
import { ToastContainer } from "../src/components/ui/Toast";
import { DialogContainer } from "../src/components/ui/Dialog";
import { initAlertPolyfill } from "../src/utils/alertPolyfill";
import { initGlobalErrorHandlers } from "../src/services/telemetry/crashReporter";
import { useDeepLinking } from "../src/services/navigation/deepLinkingService";
import { initSupabaseRealtimeBridge } from "../src/services/events/supabaseRealtimeBridge";

// Initialize global crash and unhandled exception reporter
initGlobalErrorHandlers();
// Initialize branded Dialog alert polyfill for Web & Mobile
initAlertPolyfill();

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
const RouteChunkFallback = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.fallbackContainer, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  );
};

const RootLayoutContent = () => {
  const { isAuthenticated, loading } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  // Initialize Deep Linking lifecycle (universal links, custom schemes, deferred links)
  useDeepLinking(router);

  // Initialize Supabase Realtime to appEventBus bridge for live cross-app updates
  useEffect(() => {
    const cleanupRealtime = initSupabaseRealtimeBridge();
    return () => cleanupRealtime?.();
  }, []);

  // Initialize unified encrypted session store & token refresh interceptor
  useEffect(() => {
    const cleanup = useAuthStore.getState().initializeAuth();
    return () => cleanup?.();
  }, []);

  const [fontsLoaded, fontError] = useFonts({
    HindSiliguri_300Light: require("../assets/fonts/HindSiliguri_300Light.ttf"),
    HindSiliguri_400Regular: require("../assets/fonts/HindSiliguri_400Regular.ttf"),
    HindSiliguri_500Medium: require("../assets/fonts/HindSiliguri_500Medium.ttf"),
    HindSiliguri_600SemiBold: require("../assets/fonts/HindSiliguri_600SemiBold.ttf"),
    HindSiliguri_700Bold: require("../assets/fonts/HindSiliguri_700Bold.ttf"),
    NotoSansBengali_400Regular: require("../assets/fonts/NotoSansBengali_400Regular.ttf"),
    NotoSansBengali_600SemiBold: require("../assets/fonts/NotoSansBengali_600SemiBold.ttf"),
    NotoSansBengali_700Bold: require("../assets/fonts/NotoSansBengali_700Bold.ttf"),
  });

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

    if (!loading && (fontsLoaded || fontError)) {
      SplashScreen.hideAsync().catch(console.error);
    }

    return () => {
      cancelOAuthInit();
    };
  }, [loading, fontsLoaded, fontError]);

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
    // Non-intrusive push notification listener: do NOT pop permission prompt on startup
    let listenerSub: { remove: () => void } | undefined;
    const cancelPushInit = scheduleLowPriorityTask(
      async () => {
        try {
          const { fcmNotificationService } = await import("../src/services/fcmNotificationService");
          // Check existing permission silently (forcePrompt = false)
          await fcmNotificationService.registerForPushNotifications(undefined, false);
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
          contentStyle: { backgroundColor: colors.background },
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

        {/* Unified Screens Stack (All sub-screens under app/screens) */}
        <Stack.Screen
          name="screens"
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

        {/* Dynamic B2B Travel Agency Web Portal (Isolated into Async Chunks) */}
        <Stack.Screen
          name="agency"
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

        {/* 404 Unmatched Route Catch-All */}
        <Stack.Screen
          name="+not-found"
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
        <I18nextProvider i18n={i18n}>
          <LanguageProvider>
            <ThemedStatusBar />
            <NetworkProvider>
              <AuthProvider>
                <ErrorBoundary screenName="RootLayout">
                  <OfflineBanner />
                  <RootLayoutContent />
                  <DialogContainer />
                  <ToastContainer />
                </ErrorBoundary>
              </AuthProvider>
            </NetworkProvider>
          </LanguageProvider>
        </I18nextProvider>
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
