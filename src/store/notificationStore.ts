/**
 * Notification Store (Zustand)
 * In-app and push notification state with offline caching and badge counter.
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { supabase } from "../utils/supabase";
import { cachedStateStorage } from "./storage";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: "booking" | "promo" | "flight_alert" | "system" | "chat";
  data?: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  addNotification: (
    notification: Omit<AppNotification, "id" | "created_at" | "is_read">,
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  fetchNotifications: (userId: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [
        {
          id: "notif-welcome",
          title: "Welcome to Travel Agency!",
          body: "Plan your next dream holiday with instant confirmations and best fare guarantee.",
          type: "system",
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ],
      unreadCount: 1,
      isLoading: false,
      error: null,

      addNotification: (item) => {
        const newNotif: AppNotification = {
          ...item,
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          is_read: false,
          created_at: new Date().toISOString(),
        };

        set((state) => {
          const list = [newNotif, ...state.notifications];
          return {
            notifications: list,
            unreadCount: list.filter((n) => !n.is_read).length,
          };
        });
      },

      markAsRead: (id) => {
        set((state) => {
          const list = state.notifications.map((n) =>
            n.id === id ? { ...n, is_read: true } : n,
          );
          return {
            notifications: list,
            unreadCount: list.filter((n) => !n.is_read).length,
          };
        });
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
          unreadCount: 0,
        }));
      },

      removeNotification: (id) => {
        set((state) => {
          const list = state.notifications.filter((n) => n.id !== id);
          return {
            notifications: list,
            unreadCount: list.filter((n) => !n.is_read).length,
          };
        });
      },

      clearAll: () => set({ notifications: [], unreadCount: 0 }),

      fetchNotifications: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(50);

          if (!error && data) {
            const mapped: AppNotification[] = data.map((d: any) => ({
              id: d.id,
              title: d.title || "Notification",
              body: d.body || d.message || "",
              type: d.type || "system",
              data: d.data,
              is_read: Boolean(d.is_read),
              created_at: d.created_at || new Date().toISOString(),
            }));

            set({
              notifications: mapped,
              unreadCount: mapped.filter((n) => !n.is_read).length,
              isLoading: false,
            });
          } else {
            set({ isLoading: false });
          }
        } catch (err: any) {
          set({ isLoading: false, error: err?.message || "Failed to load notifications" });
        }
      },
    }),
    {
      name: "notifications_store",
      storage: createJSONStorage(() => cachedStateStorage),
      partialize: (state) => ({
        notifications: state.notifications,
        unreadCount: state.unreadCount,
      }),
    },
  ),
);
