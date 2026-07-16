export const COLORS = {
  primary: "#4F46E5",
  secondary: "#06B6D4",
  accent: "#F97316",
  success: "#22C55E",
  danger: "#EF4444",
  warning: "#FACC15",
  background: "#0F172A",
  surface: "#1E293B",
  surfaceLight: "#334155",
  border: "#475569",
  text: "#F1F5F9",
  textSecondary: "#CBD5E1",
  textTertiary: "#94A3B8",
  tertiary: "#A855F7",
};

export const TYPOGRAPHY = {
  h1: { fontSize: 32, fontWeight: "800" as const, lineHeight: 40 },
  h2: { fontSize: 24, fontWeight: "700" as const, lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: "700" as const, lineHeight: 28 },
  body: { fontSize: 16, fontWeight: "400" as const, lineHeight: 24 },
  caption: { fontSize: 12, fontWeight: "500" as const, lineHeight: 16 },
};

export type RootTabParamList = {
  DashboardTab: undefined;
  OperationsTab: undefined;
  BookingsTab: undefined;
  MessagesTab: undefined;
  ProfileTab: undefined;
};

export type BookingsStackParamList = {
  BookingsList: undefined;
  BookingDetails: { bookingId: string };
};

export type CustomersStackParamList = {
  CustomersList: undefined;
  CustomerDetails: { customerId: string };
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
