import { StatusBar } from "expo-status-bar";
import React, { useState, useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { supabase } from "./src/lib/supabase";
import { Session } from "@supabase/supabase-js";
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

// Minimal Route System
type RouteId =
  | 'splash' | 'onboarding' | 'login' | 'signUp' | 'forgotPassword'
  | 'dashboard' | 'reservations' | 'rooms' | 'guest' | 'earnings'
  | 'messages' | 'chat' | 'housekeeping' | 'maintenance' | 'reports'
  | 'settings' | 'support' | 'devices' | 'otp' | 'resetPass' | '2fa' | 'staff';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeRoute, setActiveRoute] = useState<RouteId>('splash');

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
        // Only redirect to login if we are in the main app
        if (!['splash', 'onboarding', 'signUp', 'forgotPassword'].includes(activeRoute)) {
           setActiveRoute('login');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const navigation = {
    navigate: (route: RouteId) => setActiveRoute(route),
    goBack: () => setActiveRoute('login'), // Simplified
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#020617', alignItems: 'center', justify: 'center' }}>
        <ActivityIndicator size="large" color="#8083ff" />
      </View>
    );
  }

  // Render Logic
  const renderScreen = () => {
    switch (activeRoute) {
      case 'splash': return <SplashScreen navigation={navigation} />;
      case 'onboarding': return <OnboardingScreen navigation={navigation} />;
      case 'login': return <LoginScreen navigation={navigation} />;
      case 'signUp': return <SignUpScreen navigation={navigation} />;
      case 'forgotPassword': return <ForgotPasswordScreen navigation={navigation} />;

      // Protected Routes
      case 'dashboard': return <DashboardScreen />;
      case 'reservations': return <ReservationsScreen />;
      case 'rooms': return <RoomManagementScreen />;
      case 'guest': return <GuestDetailsScreen />;
      case 'earnings': return <EarningsOverviewScreen />;
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
      case 'staff': return <StaffManagementScreen />;

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
