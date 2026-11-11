/**
 * Hotel Hospitality System RBAC Governance Context
 * Implements roles: General Manager, Front Desk, Housekeeping, Maintenance
 */

import React, { createContext, useContext, useState } from "react";

export type HotelRole =
  | "GENERAL_MANAGER"
  | "FRONT_DESK"
  | "HOUSEKEEPING"
  | "MAINTENANCE";

export type HotelPermission =
  | "property.earnings_view"
  | "staff.manage"
  | "reservations.manage"
  | "rooms.cleanliness_update"
  | "rooms.maintenance_update"
  | "reports.view"
  | "settings.manage";

export const HOTEL_ROLE_PERMISSIONS: Record<HotelRole, HotelPermission[]> = {
  GENERAL_MANAGER: [
    "property.earnings_view",
    "staff.manage",
    "reservations.manage",
    "rooms.cleanliness_update",
    "rooms.maintenance_update",
    "reports.view",
    "settings.manage",
  ],
  FRONT_DESK: [
    "reservations.manage",
    "rooms.cleanliness_update",
    "rooms.maintenance_update",
    "reports.view",
  ],
  HOUSEKEEPING: [
    "rooms.cleanliness_update",
    "rooms.maintenance_update",
  ],
  MAINTENANCE: [
    "rooms.maintenance_update",
  ],
};

export const HOTEL_ROLES_META: {
  id: HotelRole;
  label: string;
  badge: string;
  color: string;
  description: string;
}[] = [
  {
    id: "GENERAL_MANAGER",
    label: "General Manager",
    badge: "GM",
    color: "#6366f1",
    description: "Property executive governance, financial metrics, staff roster & audit",
  },
  {
    id: "FRONT_DESK",
    label: "Front Desk Reception",
    badge: "FRONT DESK",
    color: "#06b6d4",
    description: "Guest reservations, check-in / check-out, room allocation & concierge messaging",
  },
  {
    id: "HOUSEKEEPING",
    label: "Housekeeping Lead",
    badge: "HOUSEKEEPING",
    color: "#10b981",
    description: "Room cleanliness lifecycle (Clean, Dirty, Inspecting), linen and amenities",
  },
  {
    id: "MAINTENANCE",
    label: "Facility Engineer",
    badge: "MAINTENANCE",
    color: "#f59e0b",
    description: "Room maintenance work orders, HVAC, electrical, and facility repair requests",
  },
];

interface HotelRBACContextType {
  role: HotelRole;
  switchRole: (role: HotelRole) => void;
  hasPermission: (permission: HotelPermission) => boolean;
  roleMeta: (typeof HOTEL_ROLES_META)[0];
  isGM: boolean;
}

const HotelRBACContext = createContext<HotelRBACContextType>({
  role: "GENERAL_MANAGER",
  switchRole: () => {},
  hasPermission: () => true,
  roleMeta: HOTEL_ROLES_META[0],
  isGM: true,
});

export const HotelRBACProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [role, setRole] = useState<HotelRole>("GENERAL_MANAGER");

  const switchRole = (newRole: HotelRole) => {
    setRole(newRole);
  };

  const hasPermission = (permission: HotelPermission) => {
    const list = HOTEL_ROLE_PERMISSIONS[role] || [];
    return list.includes(permission);
  };

  const roleMeta =
    HOTEL_ROLES_META.find((m) => m.id === role) || HOTEL_ROLES_META[0];

  return (
    <HotelRBACContext.Provider
      value={{
        role,
        switchRole,
        hasPermission,
        roleMeta,
        isGM: role === "GENERAL_MANAGER",
      }}
    >
      {children}
    </HotelRBACContext.Provider>
  );
};

export const useHotelRBAC = () => useContext(HotelRBACContext);
