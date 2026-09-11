import React from "react";
import { useLocalSearchParams } from "expo-router";
import { AdminPortalShell, AdminTab } from "@/screens/admin/AdminPortalShell";

export default function AdminIndexPage() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const initialTab: AdminTab = (tab as AdminTab) || "dashboard";

  return <AdminPortalShell initialTab={initialTab} />;
}
