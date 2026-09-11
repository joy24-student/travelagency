import React from "react";
import { useLocalSearchParams } from "expo-router";
import { AdminPortalShell, AdminTab } from "@/screens/admin/AdminPortalShell";

export default function AdminSlugPage() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const initialTab: AdminTab = (slug as AdminTab) || "dashboard";

  return <AdminPortalShell initialTab={initialTab} />;
}
