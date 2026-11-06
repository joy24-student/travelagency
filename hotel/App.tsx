import { StatusBar } from "expo-status-bar";
import React, { useState, useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { supabase } from "./src/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { HotelRBACProvider, useHotelRBAC } from "./src/context/HotelRBACContext";
import { AccessRestrictedScreen } from "./src/components/AccessRestrictedScreen";
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
} from "./src/screens";

// Route Types
export type RouteId =
  | 'splash' | 'onboarding' | 'login' | 'signUp' | 'forgotPassword'
  | 'dashboard' | 'reservations' | 'rooms' | 'guest' | 'earnings'
  | 'messages' | 'chat' | 'housekeeping' | 'maintenance' | 'reports'
  | 'settings' | 'support' | 'devices' | 'otp' | 'resetPass' | '2fa' | 'staff';

function HotelAppContent() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeRoute, setActiveRoute] = useState<RouteId>('splash');
  const { hasPermission } = useHotelRBAC();

  useEffect(() => {
    // Initial Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session) {
        setActiveRoute('dashboard');
      }
    });

    // Listen for Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setActiveRoute('dashboard');
      } else {
        if (!['splash', 'onboarding', 'signUp', 'forgotPassword'].includes(activeRoute)) {
           setActiveRoute('login');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const navigation = {
    navigate: (route: RouteId) => setActiveRoute(route),
    goBack: () => setActiveRoute('dashboard'),
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#020617', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#8083ff" />
      </View>
    );
  }

  // Render Logic with RBAC Authorization Guards
  const renderScreen = () => {
    switch (activeRoute) {
      case 'splash': return <SplashScreen navigation={navigation} />;
      case 'onboarding': return <OnboardingScreen navigation={navigation} />;
      case 'login': return <LoginScreen navigation={navigation} />;
      case 'signUp': return <SignUpScreen navigation={navigation} />;
      case 'forgotPassword': return <ForgotPasswordScreen navigation={navigation} />;

      // Protected Hospitality Routes
      case 'dashboard': return <DashboardScreen />;
      case 'reservations': return <ReservationsScreen />;
      case 'rooms': return <RoomManagementScreen />;
      case 'guest': return <GuestDetailsScreen />;
      case 'earnings':
        if (!hasPermission('property.earnings_view')) {
          return (
            <AccessRestrictedScreen
              moduleName="Financial Earnings"
              requiredRole="General Manager"
              onGoBack={() => setActiveRoute('dashboard')}
            />
          );
        }
        return <EarningsOverviewScreen />;
      case 'messages': return <MessagesScreen />;
      case 'chat': return <ChatScreen />;
      case 'housekeeping': return <HousekeepingScreen />;
      case 'maintenance': return <MaintenanceScreen />;
      case 'reports': return <ReportsAnalyticsScreen />;
      case 'settings': return <SettingsScreen />;
      case 'support': return <ContactSupportScreen />;
      case 'devices': return <LoginDevicesScreen />;
      case 'otp': return <OTPVerificationScreen />;
      case 'resetPass': return <ResetPasswordScreen />;
      case '2fa': return <TwoFactorAuthenticationScreen />;
      case 'staff':
        if (!hasPermission('staff.manage')) {
          return (
            <AccessRestrictedScreen
              moduleName="Staff Personnel Roster"
              requiredRole="General Manager"
              onGoBack={() => setActiveRoute('dashboard')}
            />
          );
        }
        return <StaffManagementScreen />;

      default: return <LoginScreen navigation={navigation} />;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0b1326" }}>
      {renderScreen()}
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
