import React, { createContext, useContext, useState, useEffect } from "react";
import { AdminUser, AdminRole } from "@/types/admin";
import { adminService } from "@/services/adminService";
import { AdminTab } from "../AdminPortalShell";
import {
  AdminPermission,
  ROLE_PERMISSIONS,
  ROLE_ALLOWED_TABS,
  checkPermission,
  checkTabAllowed,
} from "./rbacTypes";

interface RBACContextType {
  admin: AdminUser | null;
  role: AdminRole;
  switchRole: (role: AdminRole) => void;
  hasPermission: (permission: AdminPermission) => boolean;
  isTabAllowed: (tab: AdminTab) => boolean;
  allowedTabs: AdminTab[];
  permissions: AdminPermission[];
  loading: boolean;
}

const RBACContext = createContext<RBACContextType>({
  admin: null,
  role: AdminRole.SUPER_ADMIN,
  switchRole: () => {},
  hasPermission: () => false,
  isTabAllowed: () => false,
  allowedTabs: [],
  permissions: [],
  loading: true,
});

export const RBACProvider: React.FC<{
  initialAdmin?: AdminUser | null;
  children: React.ReactNode;
}> = ({ initialAdmin, children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(initialAdmin || null);
  const [loading, setLoading] = useState(!initialAdmin);

  useEffect(() => {
    if (!initialAdmin) {
      adminService.getCurrentAdmin().then((data) => {
        setAdmin(data);
        setLoading(false);
      });
    }
  }, [initialAdmin]);

  const currentRole = admin?.role || AdminRole.SUPER_ADMIN;

  const switchRole = (newRole: AdminRole) => {
    if (!admin) return;
    setAdmin({
      ...admin,
      role: newRole,
    });
  };

  const hasPermission = (permission: AdminPermission) => {
    return checkPermission(admin, permission);
  };

  const isTabAllowed = (tab: AdminTab) => {
    return checkTabAllowed(currentRole, tab);
  };

  const allowedTabs = ROLE_ALLOWED_TABS[currentRole] || ["dashboard"];
  const permissions = ROLE_PERMISSIONS[currentRole] || [];

  return (
    <RBACContext.Provider
      value={{
        admin,
        role: currentRole,
        switchRole,
        hasPermission,
        isTabAllowed,
        allowedTabs,
        permissions,
        loading,
      }}
    >
      {children}
    </RBACContext.Provider>
  );
};

export const useRBAC = () => useContext(RBACContext);
