/**
 * Navigation Types for Agency Portal
 * Type-safe navigation routing and parameters
 */

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";

// ============================================
// ROOT NAVIGATOR PARAMS
// ============================================
export type RootNavigatorParamList = {
  AuthStack: undefined;
  AppStack: undefined;
};

// ============================================
// AUTH STACK PARAMS
// ============================================
export type AuthStackParamList = {
  Login: undefined;
};

// ============================================
// DASHBOARD STACK PARAMS (Nested in DashboardTab)
// ============================================
export type DashboardStackParamList = {
  DashboardList: undefined;
};

// ============================================
// OPERATIONS STACK PARAMS (Nested in OperationsTab)
// ============================================
export type OperationsStackParamList = {
  OperationsList: undefined;
};

// ============================================
// BOOKINGS STACK PARAMS (Nested in BookingsTab)
// ============================================
export type BookingsStackParamList = {
  BookingsList: undefined;
  BookingDetails: { bookingId: string };
};

// ============================================
// CUSTOMERS STACK PARAMS (Nested in CustomersTab - NOT YET IMPLEMENTED)
// ============================================
export type CustomersStackParamList = {
  CustomersList: undefined;
  CustomerDetails: { customerId: string };
};

// ============================================
// MESSAGES STACK PARAMS (Nested in MessagesTab)
// ============================================
export type MessagesStackParamList = {
  MessagesList: undefined;
};

// ============================================
// PROFILE STACK NAVIGATOR PARAMS (Nested in ProfileTab)
// ============================================
export type ProfileStackParamList = {
  ProfileMain: undefined;
  AgencyInfo: undefined;
  TeamManagement: undefined;
  BankAccounts: undefined;
  Verification: undefined;
  SupportCenter: undefined;
  Settings: undefined;
};

// ============================================
// MAIN DASHBOARD TAB NAVIGATOR PARAMS
// ============================================
export type DashboardTabParamList = {
  DashboardTab: undefined;
  OperationsTab: undefined;
  BookingsTab: undefined;
  MessagesTab: undefined;
  ProfileTab: undefined;
};

// ============================================
// COMPOSITE SCREEN PROPS (For screens in different navigators)
// ============================================

// Dashboard Tab Screen Props
export type DashboardTabScreenProps<T extends keyof DashboardTabParamList> =
  BottomTabScreenProps<DashboardTabParamList, T>;

// Dashboard Stack Screen Props (Composite: nested in tab)
export type DashboardStackScreenProps<T extends keyof DashboardStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<DashboardStackParamList, T>,
    DashboardTabScreenProps<"DashboardTab">
  >;

// Operations Stack Screen Props (Composite: nested in tab)
export type OperationsStackScreenProps<
  T extends keyof OperationsStackParamList,
> = CompositeScreenProps<
  NativeStackScreenProps<OperationsStackParamList, T>,
  DashboardTabScreenProps<"OperationsTab">
>;

// Bookings Stack Screen Props (Composite: nested in tab)
export type BookingsStackScreenProps<T extends keyof BookingsStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<BookingsStackParamList, T>,
    DashboardTabScreenProps<"BookingsTab">
  >;

// Customers Stack Screen Props (Composite: nested in tab)
export type CustomersStackScreenProps<T extends keyof CustomersStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<CustomersStackParamList, T>,
    DashboardTabScreenProps<"BookingsTab"> // Note: Would need separate tab if implemented
  >;

// Messages Stack Screen Props (Composite: nested in tab)
export type MessagesStackScreenProps<T extends keyof MessagesStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<MessagesStackParamList, T>,
    DashboardTabScreenProps<"MessagesTab">
  >;

// Profile Stack Screen Props (Composite: nested in tab)
export type ProfileStackScreenProps<T extends keyof ProfileStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<ProfileStackParamList, T>,
    DashboardTabScreenProps<"ProfileTab">
  >;

// ============================================
// SPECIFIC SCREEN PROPS
// ============================================

// Dashboard Screens
export type DashboardScreenProps = DashboardStackScreenProps<"DashboardList">;

// Operations Screens
export type OperationsScreenProps =
  OperationsStackScreenProps<"OperationsList">;

// Bookings Screens
export type BookingsScreenProps = BookingsStackScreenProps<"BookingsList">;
export type BookingDetailsScreenProps =
  BookingsStackScreenProps<"BookingDetails">;

// Customers Screens
export type CustomersScreenProps = CustomersStackScreenProps<"CustomersList">;
export type CustomerDetailsScreenProps =
  CustomersStackScreenProps<"CustomerDetails">;

// Messages Screens
export type MessagesScreenProps = MessagesStackScreenProps<"MessagesList">;

// Profile Screens
export type ProfileScreenProps = ProfileStackScreenProps<"ProfileMain">;
export type AgencyInfoScreenProps = ProfileStackScreenProps<"AgencyInfo">;
export type TeamManagementScreenProps =
  ProfileStackScreenProps<"TeamManagement">;
export type BankAccountsScreenProps = ProfileStackScreenProps<"BankAccounts">;
export type VerificationScreenProps = ProfileStackScreenProps<"Verification">;
export type SupportCenterScreenProps = ProfileStackScreenProps<"SupportCenter">;
export type SettingsScreenProps = ProfileStackScreenProps<"Settings">;

// Auth Screen Props
export type LoginScreenProps = NativeStackScreenProps<
  AuthStackParamList,
  "Login"
>;

// ============================================
// NAVIGATION HELPER TYPE
// ============================================
export type NavigationProp = any; // For components that don't use navigation directly
