/**
 * Navigation Service
 * Centralized navigation routing and helpers
 */

import { CommonActions } from "@react-navigation/native";
import type { NavigationProp as BaseNavigationProp } from "@react-navigation/native";
import type {
  DashboardTabParamList,
  ProfileStackParamList,
} from "../types/navigation";

// Navigation Helper Class
export class NavigationService {
  static navigation: BaseNavigationProp<any> | null = null;

  static setNavigation(navigation: BaseNavigationProp<any>) {
    this.navigation = navigation;
  }

  // Dashboard Tab Navigation
  static navigateToDashboard() {
    this.navigation?.navigate("DashboardTab");
  }

  static navigateToOperations() {
    this.navigation?.navigate("OperationsTab");
  }

  static navigateToBookings() {
    this.navigation?.navigate("BookingsTab");
  }

  static navigateToMessages() {
    this.navigation?.navigate("MessagesTab");
  }

  static navigateToProfile() {
    this.navigation?.navigate("ProfileTab");
  }

  // Profile Modal Navigation
  static navigateToAgencyInfo() {
    this.navigation?.navigate("ProfileTab", {
      screen: "AgencyInfo",
    });
  }

  static navigateToTeamManagement() {
    this.navigation?.navigate("ProfileTab", {
      screen: "TeamManagement",
    });
  }

  static navigateToBankAccounts() {
    this.navigation?.navigate("ProfileTab", {
      screen: "BankAccounts",
    });
  }

  static navigateToVerification() {
    this.navigation?.navigate("ProfileTab", {
      screen: "Verification",
    });
  }

  static navigateToSupportCenter() {
    this.navigation?.navigate("ProfileTab", {
      screen: "SupportCenter",
    });
  }

  static navigateToSettings() {
    this.navigation?.navigate("ProfileTab", {
      screen: "Settings",
    });
  }

  // Generic navigation
  static navigate(name: string, params?: any) {
    this.navigation?.navigate(name as any, params);
  }

  // Go back
  static goBack() {
    this.navigation?.goBack();
  }

  // Replace route
  static replace(name: string, params?: any) {
    this.navigation?.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name, params }],
      }),
    );
  }
}

// Navigation Route Names
export const ROUTES = {
  // Tab Routes
  DASHBOARD: "DashboardTab" as const,
  OPERATIONS: "OperationsTab" as const,
  BOOKINGS: "BookingsTab" as const,
  MESSAGES: "MessagesTab" as const,
  PROFILE: "ProfileTab" as const,

  // Profile Stack Routes
  AGENCY_INFO: "AgencyInfo" as const,
  TEAM_MANAGEMENT: "TeamManagement" as const,
  BANK_ACCOUNTS: "BankAccounts" as const,
  VERIFICATION: "Verification" as const,
  SUPPORT_CENTER: "SupportCenter" as const,
  SETTINGS: "Settings" as const,

  // Auth Routes
  LOGIN: "Login" as const,
};

// Deep Linking Configuration
export const linking = {
  prefixes: ["shopnojatra://", "https://agency.shopnojatra.com"],
  config: {
    screens: {
      DashboardTab: "dashboard",
      OperationsTab: "operations",
      BookingsTab: "bookings",
      MessagesTab: "messages",
      ProfileTab: {
        screens: {
          ProfileMain: "profile",
          AgencyInfo: "profile/agency-info",
          TeamManagement: "profile/team",
          BankAccounts: "profile/bank",
          Verification: "profile/verification",
          SupportCenter: "profile/support",
          Settings: "profile/settings",
        },
      },
      Login: "login",
    },
  },
};
