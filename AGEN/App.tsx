/**
 * ShopnoJatra Agency Portal - React Native App
 * Enterprise-grade Agency Management Dashboard
 * Production-ready with full Supabase integration
 */

import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, View } from "react-native";
import { I18nextProvider } from 'react-i18next';
import i18n from './src/locales/i18n';
import { LanguageProvider } from './src/context/LanguageContext';

// Screen Imports
import DashboardScreen from "./src/screens/agency/DashboardScreen";
import OperationsScreen from "./src/screens/agency/OperationsScreen";
import BookingsScreen from "./src/screens/agency/BookingsScreen";
import BookingDetailsScreen from "./src/screens/agency/BookingDetailsScreen";
import ChatScreen from "./src/screens/agency/ChatScreen";
import CustomersScreen from "./src/screens/agency/CustomersScreen";
import CustomerDetailsScreen from "./src/screens/agency/CustomerDetailsScreen";
import MessagesScreen from "./src/screens/agency/MessagesScreen";
import ProfileScreen from "./src/screens/agency/ProfileScreen";
import AgencyInfoScreen from "./src/screens/agency/AgencyInfoScreen";
import TeamManagementScreen from "./src/screens/agency/TeamManagementScreen";
import BankAccountsScreen from "./src/screens/agency/BankAccountsScreen";
import VerificationScreen from "./src/screens/agency/VerificationScreen";
import CustomerProfileScreen from "./src/screens/agency/CustomerProfileScreen"; // Import the new screen
import SupportCenterScreen from "./src/screens/agency/SupportCenterScreen";
import SettingsScreen from "./src/screens/agency/SettingsScreen";

// Authentication
import { useAuth } from "./src/hooks/useAuth";
import LoginScreen from "./src/screens/auth/LoginScreen";
import SignUpScreen from "./src/screens/auth/SignUpScreen";
import ForgotPasswordScreen from "./src/screens/auth/ForgotPasswordScreen";
import OtpScreen from "./src/screens/auth/OtpScreen";
import { AuthStackParamList } from "./src/navigation/types";

// Navigation Types
export type RootTabParamList = {
  DashboardTab: undefined;
  OperationsTab: undefined;
  BookingsTab: undefined;
  MessagesTab: undefined;
  ProfileTab: undefined;
};

export type DashboardStackParamList = {
  DashboardList: undefined;
};

export type OperationsStackParamList = {
  OperationsList: undefined;
};

export type BookingsStackParamList = {
  BookingsList: undefined;
  BookingDetails: { bookingId: string };
};

export type CustomersStackParamList = {
  CustomersList: undefined;
  CustomerDetails: { customerId: string };
};

export type MessagesStackParamList = {
  MessagesList: undefined;
  chat: { userId: string; name: string }; // Add chat to MessagesStackParamList
  customerProfile: { customerId: string; name: string; avatarUrl?: string }; // Add CustomerProfile to MessagesStack
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  AgencyInfo: undefined;
  TeamManagement: undefined;
  BankAccounts: undefined;
  Verification: undefined;
  SupportCenter: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const DashboardStack = createNativeStackNavigator<DashboardStackParamList>();
const OperationsStack = createNativeStackNavigator<OperationsStackParamList>();
const BookingsStack = createNativeStackNavigator<BookingsStackParamList>();
const CustomersStack = createNativeStackNavigator<CustomersStackParamList>();
const MessagesStack = createNativeStackNavigator<MessagesStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

// Design System Colors
import { COLORS, TYPOGRAPHY } from "./src/config/theme";

export { COLORS, TYPOGRAPHY };

// Dashboard Stack Navigator
function DashboardStackNavigator() {
  return (
    <DashboardStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <DashboardStack.Screen
        name="DashboardList"
        component={DashboardScreen}
        options={{ headerShown: false }}
      />
    </DashboardStack.Navigator>
  );
}

// Operations Stack Navigator
function OperationsStackNavigator() {
  return (
    <OperationsStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <OperationsStack.Screen
        name="OperationsList"
        component={OperationsScreen}
        options={{ headerShown: false }}
      />
    </OperationsStack.Navigator>
  );
}

// Bookings Stack Navigator - Includes Booking Details
function BookingsStackNavigator() {
  return (
    <BookingsStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <BookingsStack.Screen
        name="BookingsList"
        component={BookingsScreen}
        options={{ headerShown: false }}
      />
      <BookingsStack.Screen
        name="BookingDetails"
        component={BookingDetailsScreen}
        options={{
          presentation: "modal",
        }}
      />
    </BookingsStack.Navigator>
  );
}

// Customers Stack Navigator - Includes Customer Details
function CustomersStackNavigator() {
  return (
    <CustomersStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <CustomersStack.Screen
        name="CustomersList"
        component={CustomersScreen}
        options={{ headerShown: false }}
      />
      <CustomersStack.Screen
        name="CustomerDetails"
        component={CustomerDetailsScreen}
        options={{
          presentation: "modal",
        }}
      />
    </CustomersStack.Navigator>
  );
}

// Messages Stack Navigator
function MessagesStackNavigator() {
  return (
    <MessagesStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <MessagesStack.Screen
        name="MessagesList"
        component={MessagesScreen}
        options={{ headerShown: false }}
      />
      <MessagesStack.Screen // Add ChatScreen to MessagesStack
        name="chat"
        component={ChatScreen}
        options={{ headerShown: false }}
      />
      <MessagesStack.Screen // Add CustomerProfileScreen to MessagesStack
        name="customerProfile"
        component={CustomerProfileScreen}
        options={{ headerShown: false }}
      />
    </MessagesStack.Navigator>
  );
}

// Profile Stack Navigator - Handles all profile-related screens
function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <ProfileStack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{
          headerShown: false,
        }}
      />
      <ProfileStack.Screen
        name="AgencyInfo"
        component={AgencyInfoScreen}
        options={{
          presentation: "modal",
        }}
      />
      <ProfileStack.Screen
        name="TeamManagement"
        component={TeamManagementScreen}
        options={{
          presentation: "modal",
        }}
      />
      <ProfileStack.Screen
        name="BankAccounts"
        component={BankAccountsScreen}
        options={{
          presentation: "modal",
        }}
      />
      <ProfileStack.Screen
        name="Verification"
        component={VerificationScreen}
        options={{
          presentation: "modal",
        }}
      />
      <ProfileStack.Screen
        name="SupportCenter"
        component={SupportCenterScreen}
        options={{
          presentation: "modal",
        }}
      />
      <ProfileStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          presentation: "modal",
        }}
      />
    </ProfileStack.Navigator>
  );
}

// Dashboard Tab Navigator - Main navigation with 5 tabs
function DashboardTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = "grid";

          if (route.name === "DashboardTab") {
            iconName = "grid";
          } else if (route.name === "OperationsTab") {
            iconName = "settings";
          } else if (route.name === "BookingsTab") {
            iconName = "calendar";
          } else if (route.name === "MessagesTab") {
            iconName = "mail";
          } else if (route.name === "ProfileTab") {
            iconName = "person";
          }

          return (
            <Ionicons
              name={(focused ? iconName : `${iconName}-outline`) as any}
              size={size}
              color={color}
            />
          );
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textTertiary,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      })}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardStackNavigator}
        options={{ title: "Dashboard" }}
      />
      <Tab.Screen
        name="OperationsTab"
        component={OperationsStackNavigator}
        options={{ title: "Operations" }}
      />
      <Tab.Screen
        name="BookingsTab"
        component={BookingsStackNavigator}
        options={{ title: "Bookings" }}
      />
      <Tab.Screen
        name="MessagesTab"
        component={MessagesStackNavigator}
        options={{ title: "Messages" }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{ title: "Profile" }}
      />
    </Tab.Navigator>
  );
}

// Main App Component
export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <I18nextProvider i18n={i18n}>
        <LanguageProvider>
          <NavigationContainer>
            <StatusBar style="light" backgroundColor={COLORS.background} />
            {user ? (
              <DashboardTabNavigator />
            ) : (
              <AuthStack.Navigator screenOptions={{ headerShown: false }}>
                <AuthStack.Screen name="Login" component={LoginScreen} />
                <AuthStack.Screen name="SignUp" component={SignUpScreen} />
                <AuthStack.Screen
                  name="ForgotPassword"
                  component={ForgotPasswordScreen}
                />
                <AuthStack.Screen name="OtpVerification" component={OtpScreen} />
              </AuthStack.Navigator>
            )}
          </NavigationContainer>
        </LanguageProvider>
      </I18nextProvider>
    </GestureHandlerRootView>
  );
}