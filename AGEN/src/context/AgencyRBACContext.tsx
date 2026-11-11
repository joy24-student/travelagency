/**
 * B2B Agency Portal RBAC Governance Context
 * Defines agency personas, permission matrix, and role switching for administrative controls.
 */

import React, { createContext, useContext, useState } from "react";

export type AgencyRole =
  | "AGENCY_OWNER"
  | "AGENCY_MANAGER"
  | "AGENCY_AGENT"
  | "AGENCY_FINANCE";

export type AgencyPermission =
  | "team.manage"
  | "team.view"
  | "banking.manage"
  | "banking.view"
  | "verification.upload"
  | "bookings.manage"
  | "bookings.view"
  | "finance.view"
  | "settings.manage";

export const AGENCY_ROLE_PERMISSIONS: Record<AgencyRole, AgencyPermission[]> = {
  AGENCY_OWNER: [
    "team.manage",
    "team.view",
    "banking.manage",
    "banking.view",
    "verification.upload",
    "bookings.manage",
    "bookings.view",
    "finance.view",
    "settings.manage",
  ],
  AGENCY_MANAGER: [
    "team.manage",
    "team.view",
    "banking.view",
    "verification.upload",
    "bookings.manage",
    "bookings.view",
    "finance.view",
    "settings.manage",
  ],
  AGENCY_AGENT: [
    "team.view",
    "bookings.manage",
    "bookings.view",
  ],
  AGENCY_FINANCE: [
    "team.view",
    "banking.view",
    "finance.view",
    "bookings.view",
  ],
};

export const AGENCY_ROLES_META: {
  id: AgencyRole;
  label: string;
  badge: string;
  color: string;
  description: string;
}[] = [
  {
    id: "AGENCY_OWNER",
    label: "Agency Owner",
    badge: "OWNER",
    color: "#6366f1",
    description: "Complete agency governance, payout banking setup, staff management & verification",
  },
  {
    id: "AGENCY_MANAGER",
    label: "Agency Manager",
    badge: "MANAGER",
    color: "#06b6d4",
    description: "Operations supervisor, booking allocations, document submissions, team lead",
  },
  {
    id: "AGENCY_AGENT",
    label: "Travel Agent",
    badge: "AGENT",
    color: "#10b981",
    description: "Frontline customer travel support, itinerary creation, guest communication",
  },
  {
    id: "AGENCY_FINANCE",
    label: "Finance Controller",
    badge: "FINANCE",
    color: "#f59e0b",
    description: "Accounts inspection, commission audit reconciliation, settlement ledger view",
  },
];

interface AgencyRBACContextType {
  role: AgencyRole;
  switchRole: (role: AgencyRole) => void;
  hasPermission: (permission: AgencyPermission) => boolean;
  roleMeta: (typeof AGENCY_ROLES_META)[0];
  isOwner: boolean;
  isManager: boolean;
}

const AgencyRBACContext = createContext<AgencyRBACContextType>({
  role: "AGENCY_OWNER",
  switchRole: () => {},
  hasPermission: () => true,
  roleMeta: AGENCY_ROLES_META[0],
  isOwner: true,
  isManager: false,
});

export const AgencyRBACProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [role, setRole] = useState<AgencyRole>("AGENCY_OWNER");

  const switchRole = (newRole: AgencyRole) => {
    setRole(newRole);
  };

  const hasPermission = (permission: AgencyPermission) => {
    const list = AGENCY_ROLE_PERMISSIONS[role] || [];
    return list.includes(permission);
  };

  const roleMeta =
    AGENCY_ROLES_META.find((m) => m.id === role) || AGENCY_ROLES_META[0];

  return (
    <AgencyRBACContext.Provider
      value={{
        role,
        switchRole,
        hasPermission,
        roleMeta,
        isOwner: role === "AGENCY_OWNER",
        isManager: role === "AGENCY_MANAGER",
      }}
    >
      {children}
    </AgencyRBACContext.Provider>
  );
};

export const useAgencyRBAC = () => useContext(AgencyRBACContext);
