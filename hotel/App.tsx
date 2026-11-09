import { StatusBar } from "expo-status-bar";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  BackHandler,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import * as Linking from "expo-linking";
import { MaterialIcons } from "@expo/vector-icons";
import { supabase } from "./src/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { HotelRBACProvider, useHotelRBAC } from "./src/context/HotelRBACContext";
import { AccessRestrictedScreen } from "./src/components/AccessRestrictedScreen";
import { initHotelRealtimeBridge } from "./src/services/hotelRealtimeBridge";
import {
  SplashScreen,
  OnboardingScreen,
  LoginScreen,
  SignUpScreen,
  ForgotPasswordScreen,
  DashboardScreen,
  ReservationsScreen,
  RoomManagementScreen,
  GuestDetailsScreen,
  EarningsOverviewScreen,
  MessagesScreen,
  ChatScreen,
  HousekeepingScreen,
  MaintenanceScreen,
  ReportsAnalyticsScreen,
  SettingsScreen,
  ContactSupportScreen,
  LoginDevicesScreen,
  OTPVerificationScreen,
  ResetPasswordScreen,
  TwoFactorAuthenticationScreen,
  StaffManagementScreen,
  HotelScannerScreen,
} from "./src/screens";

// Route Types
export type RouteId =
  | 'splash' | 'onboarding' | 'login' | 'signUp' | 'forgotPassword'
  | 'dashboard' | 'reservations' | 'rooms' | 'guest' | 'earnings'
  | 'messages' | 'chat' | 'housekeeping' | 'maintenance' | 'reports'
  | 'settings' | 'support' | 'devices' | 'otp' | 'resetPass' | '2fa' | 'staff' | 'scanner';

export interface RouteEntry {
  route: RouteId;
  params?: Record<string, any>;
}

export interface HotelNavigation {
  navigate: (route: RouteId, params?: Record<string, any>) => void;
  goBack: () => boolean;
  replace: (route: RouteId, params?: Record<string, any>) => void;
  reset: (route: RouteId, params?: Record<string, any>) => void;
  canGoBack: () => boolean;
}

// Core tabs that display bottom navigation bar
const CORE_BOTTOM_TABS: RouteId[] = ['dashboard', 'reservations', 'rooms', 'messages', 'settings'];

// Map route names from deep link path/host to RouteId
function normalizeDeepLinkRoute(rawRoute: string): RouteId | null {
  const clean = rawRoute.toLowerCase().replace(/^\/+|\/+$/g, '').trim();
  switch (clean) {
    case 'dashboard':
    case 'home':
      return 'dashboard';
    case 'reservations':
    case 'reservation':
    case 'bookings':
      return 'reservations';
    case 'rooms':
    case 'room':
    case 'roommanagement':
      return 'rooms';
    case 'guest':
    case 'guestdetails':
    case 'guests':
      return 'guest';
    case 'earnings':
    case 'revenue':
      return 'earnings';
    case 'messages':
    case 'inbox':
    case 'chats':
      return 'messages';
    case 'chat':
      return 'chat';
    case 'housekeeping':
      return 'housekeeping';
    case 'maintenance':
      return 'maintenance';
    case 'reports':
    case 'analytics':
      return 'reports';
    case 'settings':
      return 'settings';
    case 'support':
    case 'contact':
      return 'support';
    case 'staff':
      return 'staff';
    case 'devices':
      return 'devices';
    case 'otp':
      return 'otp';
    case 'login':
      return 'login';
    default:
      return null;
  }
}

function HotelAppContent() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Robust Back Stack Navigation State
  const [stack, setStack] = useState<RouteEntry[]>([{ route: 'splash' }]);
  const { hasPermission } = useHotelRBAC();

  const currentEntry = stack[stack.length - 1] || { route: 'dashboard' };
  const activeRoute = currentEntry.route;
  const activeParams = currentEntry.params || {};

  // Navigation Controller with Back Stack
  const navigation: HotelNavigation = useMemo(
    () => ({
      navigate: (route: RouteId, params?: Record<string, any>) => {
        setStack((prev) => {
          const top = prev[prev.length - 1];
          // Prevent exact duplicate screen pushes
          if (top && top.route === route && JSON.stringify(top.params) === JSON.stringify(params)) {
            return prev;
          }
          return [...prev, { route, params }];
        });
      },
      goBack: () => {
        let didPop = false;
        setStack((prev) => {
          if (prev.length > 1) {
            didPop = true;
            return prev.slice(0, -1);
          }
          // If on sub-screen but stack has only 1 entry, return to dashboard
          if (prev.length === 1 && prev[0].route !== 'dashboard' && prev[0].route !== 'login') {
            didPop = true;
            return [{ route: 'dashboard' }];
          }
          return prev;
        });
        return didPop;
      },
      replace: (route: RouteId, params?: Record<string, any>) => {
        setStack((prev) => {
          const rest = prev.slice(0, -1);
          return [...rest, { route, params }];
        });
      },
      reset: (route: RouteId, params?: Record<string, any>) => {
        setStack([{ route, params }]);
      },
      canGoBack: () => stack.length > 1 || (activeRoute !== 'dashboard' && activeRoute !== 'login'),
    }),
    [stack.length, activeRoute]
  );

  // Hardware Back Button Handler (Android)
  useEffect(() => {
    const onBackPress = () => {
      if (stack.length > 1) {
        navigation.goBack();
        return true; // Prevent app exit, consume back event
      }
      if (activeRoute !== 'dashboard' && session) {
        navigation.reset('dashboard');
        return true;
      }
      return false; // Allow app exit from root screen
    };

    const backSubscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSubscription.remove();
  }, [stack.length, activeRoute, session, navigation]);

  // Deep Linking Handler
  const handleDeepLink = useCallback(
    (url: string | null) => {
      if (!url) return;
      try {
        const parsed = Linking.parse(url);
        const targetPath = parsed.hostname || parsed.path || '';
        const targetRoute = normalizeDeepLinkRoute(targetPath);

        if (targetRoute) {
          const queryParams = (parsed.queryParams as Record<string, any>) || {};
          // Ensure deep linking places user on screen with back stack rooted at dashboard
          setStack((prev) => {
            const hasDashboard = prev.some((e) => e.route === 'dashboard');
            const base: RouteEntry[] = hasDashboard
              ? prev.filter((e) => e.route !== targetRoute)
              : [{ route: 'dashboard' as RouteId }];
            return [...base, { route: targetRoute, params: queryParams }];
          });
        }
      } catch (err) {
        console.warn('[HotelDeepLink] Error handling URL:', url, err);
      }
    },
    []
  );

  // Initialize Deep Linking lifecycle & cold boot URL
  useEffect(() => {
    // 1. Cold boot URL
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // 2. Runtime URL events
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => subscription.remove();
  }, [handleDeepLink]);

  // Initialize Realtime Cross-App Synchronization
  useEffect(() => {
    const teardownRealtime = initHotelRealtimeBridge();
    return () => teardownRealtime();
  }, []);

  // Supabase Auth Lifecycle
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session) {
        setStack((prev) => (prev[0]?.route === 'splash' ? [{ route: 'dashboard' as RouteId }] : prev));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setStack((prev) => {
          if (prev.length === 1 && (prev[0].route === 'login' || prev[0].route === 'splash')) {
            return [{ route: 'dashboard' as RouteId }];
          }
          return prev;
        });
      } else {
        setStack([{ route: 'login' as RouteId }]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#020617', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#8083ff" />
      </View>
    );
  }

  const routeProp = { name: activeRoute, params: activeParams };
  const showBottomNav = session && CORE_BOTTOM_TABS.includes(activeRoute);
  const showBackHeader = session && !CORE_BOTTOM_TABS.includes(activeRoute) && navigation.canGoBack();

  // Render Screen with RBAC Guards & Route/Navigation Props
  const renderScreen = () => {
    const screenProps = { navigation, route: routeProp } as any;

    switch (activeRoute) {
      case 'splash':
        return <SplashScreen {...screenProps} />;
      case 'onboarding':
        return <OnboardingScreen {...screenProps} />;
      case 'login':
        return <LoginScreen {...screenProps} />;
      case 'signUp':
        return <SignUpScreen {...screenProps} />;
      case 'forgotPassword':
        return <ForgotPasswordScreen {...screenProps} />;

      // Protected Hospitality Routes
      case 'dashboard':
        return <DashboardScreen {...screenProps} />;
      case 'reservations':
        return <ReservationsScreen {...screenProps} />;
      case 'rooms':
        return <RoomManagementScreen {...screenProps} />;
      case 'guest':
        return <GuestDetailsScreen {...screenProps} />;
      case 'earnings':
        if (!hasPermission('property.earnings_view')) {
          return (
            <AccessRestrictedScreen
              moduleName="Financial Earnings"
              requiredRole="General Manager"
              onGoBack={() => navigation.goBack()}
            />
          );
        }
        return <EarningsOverviewScreen {...screenProps} />;
      case 'messages':
        return <MessagesScreen {...screenProps} />;
      case 'chat':
        return <ChatScreen {...screenProps} />;
      case 'housekeeping':
        return <HousekeepingScreen {...screenProps} />;
      case 'maintenance':
        return <MaintenanceScreen {...screenProps} />;
      case 'reports':
        return <ReportsAnalyticsScreen {...screenProps} />;
      case 'settings':
        return <SettingsScreen {...screenProps} />;
      case 'support':
        return <ContactSupportScreen {...screenProps} />;
      case 'devices':
        return <LoginDevicesScreen {...screenProps} />;
      case 'otp':
        return <OTPVerificationScreen {...screenProps} />;
      case 'resetPass':
        return <ResetPasswordScreen {...screenProps} />;
      case '2fa':
        return <TwoFactorAuthenticationScreen {...screenProps} />;
      case 'scanner':
        return <HotelScannerScreen {...screenProps} />;

      case 'staff':
        if (!hasPermission('staff.manage')) {
          return (
            <AccessRestrictedScreen
              moduleName="Staff Personnel Roster"
              requiredRole="General Manager"
              onGoBack={() => navigation.goBack()}
            />
          );
        }
        return <StaffManagementScreen {...screenProps} />;

      default:
        return <LoginScreen {...screenProps} />;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0b1326" }}>
      {/* Top Back Header for Sub-Screens */}
      {showBackHeader && (
        <View style={styles.topBackHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back-ios" size={18} color="#dae2fd" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitleText} numberOfLines={1}>
            {activeRoute.charAt(0).toUpperCase() + activeRoute.slice(1)}
          </Text>
          <View style={{ width: 60 }} />
        </View>
      )}

      {/* Active Screen View */}
      <View style={{ flex: 1 }}>{renderScreen()}</View>

      {/* Modern Bottom Navigation Bar for Core Tabs */}
      {showBottomNav && (
        <View style={styles.bottomNavContainer}>
          {[
            { id: 'dashboard' as RouteId, label: 'Dashboard', icon: 'dashboard' as const },
            { id: 'reservations' as RouteId, label: 'Bookings', icon: 'event-note' as const },
            { id: 'scanner' as RouteId, label: 'Scanner', icon: 'qr-code-scanner' as const },
            { id: 'rooms' as RouteId, label: 'Rooms', icon: 'meeting-room' as const },
            { id: 'messages' as RouteId, label: 'Messages', icon: 'chat' as const },
            { id: 'settings' as RouteId, label: 'Settings', icon: 'settings' as const },
          ].map((tab) => {
            const isActive = activeRoute === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={styles.bottomTabButton}
                onPress={() => navigation.navigate(tab.id)}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.bottomTabIconContainer,
                    isActive && styles.bottomTabIconActive,
                  ]}
                >
                  <MaterialIcons
                    name={tab.icon}
                    size={22}
                    color={isActive ? '#c0c1ff' : '#94a3b8'}
                  />
                </View>
                <Text
                  style={[
                    styles.bottomTabLabel,
                    isActive ? styles.bottomTabLabelActive : styles.bottomTabLabelInactive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <StatusBar style="light" />
    </View>
  );
}

export default function App() {
  return (
    <HotelRBACProvider>
      <HotelAppContent />
    </HotelRBACProvider>
  );
}

const styles = StyleSheet.create({
  topBackHeader: {
    paddingTop: Platform.OS === 'ios' ? 48 : 28,
    paddingBottom: 10,
    paddingHorizontal: 16,
    backgroundColor: '#0b1326',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  backButtonText: {
    color: '#dae2fd',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  headerTitleText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  bottomNavContainer: {
    flexDirection: 'row',
    backgroundColor: '#070d1b',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  bottomTabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  bottomTabIconContainer: {
    padding: 4,
    borderRadius: 12,
  },
  bottomTabIconActive: {
    backgroundColor: 'rgba(192, 193, 255, 0.15)',
  },
  bottomTabLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  bottomTabLabelActive: {
    color: '#c0c1ff',
    fontWeight: '700',
  },
  bottomTabLabelInactive: {
    color: '#94a3b8',
    fontWeight: '500',
  },
});
