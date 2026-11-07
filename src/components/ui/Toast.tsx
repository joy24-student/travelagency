import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastOptions {
  id?: string;
  title?: string;
  message: string;
  type?: ToastType;
  duration?: number; // ms, default 3500
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastItem extends ToastOptions {
  id: string;
}

type ToastListener = (toasts: ToastItem[]) => void;

class ToastManager {
  private toasts: ToastItem[] = [];
  private listeners: Set<ToastListener> = new Set();
  private counter = 0;
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  subscribe(listener: ToastListener) {
    this.listeners.add(listener);
    listener(this.toasts);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener([...this.toasts]));
  }

  show(options: ToastOptions | string) {
    const opts: ToastOptions =
      typeof options === "string" ? { message: options } : options;
    const id = opts.id || `toast_${Date.now()}_${++this.counter}`;
    const newItem: ToastItem = {
      type: "info",
      duration: 3500,
      ...opts,
      id,
    };

    // Keep at most 3 simultaneous toasts
    this.toasts = [...this.toasts.slice(-2), newItem];
    this.notify();

    if (newItem.duration && newItem.duration > 0) {
      const timer = setTimeout(() => {
        this.dismiss(id);
      }, newItem.duration);
      this.timers.set(id, timer);
    }

    return id;
  }

  success(message: string, options?: Omit<ToastOptions, "message" | "type">) {
    return this.show({ ...options, message, type: "success" });
  }

  error(message: string, options?: Omit<ToastOptions, "message" | "type">) {
    return this.show({ ...options, message, type: "error" });
  }

  warning(message: string, options?: Omit<ToastOptions, "message" | "type">) {
    return this.show({ ...options, message, type: "warning" });
  }

  info(message: string, options?: Omit<ToastOptions, "message" | "type">) {
    return this.show({ ...options, message, type: "info" });
  }

  dismiss(id: string) {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  clear() {
    this.toasts = [];
    this.notify();
  }
}

export const toast = new ToastManager();
export const Toast = toast;

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return toast.subscribe(setToasts);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <SafeAreaView pointerEvents="box-none" style={styles.container}>
      <View pointerEvents="box-none" style={styles.toastList}>
        {toasts.map((item) => (
          <ToastCard
            key={item.id}
            item={item}
            onDismiss={() => toast.dismiss(item.id)}
          />
        ))}
      </View>
    </SafeAreaView>
  );
};

const ToastCard: React.FC<{ item: ToastItem; onDismiss: () => void }> = ({
  item,
  onDismiss,
}) => {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(translateYAnim, {
        toValue: 0,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: -15,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const getTheme = () => {
    switch (item.type) {
      case "success":
        return {
          icon: "checkmark-circle" as const,
          color: colors.status.success.main,
          bg: "#F0FDF4",
          border: colors.status.success.border,
        };
      case "error":
        return {
          icon: "alert-circle" as const,
          color: colors.status.danger.main,
          bg: "#FEF2F2",
          border: colors.status.danger.border,
        };
      case "warning":
        return {
          icon: "warning" as const,
          color: colors.status.warning.main,
          bg: "#FFFBEB",
          border: colors.status.warning.border,
        };
      case "info":
      default:
        return {
          icon: "information-circle" as const,
          color: colors.brand.trip.blue,
          bg: "#EFF6FF",
          border: colors.primary[200],
        };
    }
  };

  const currentTheme = getTheme();

  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.toastCard,
        {
          backgroundColor: currentTheme.bg,
          borderColor: currentTheme.border,
          opacity: opacityAnim,
          transform: [{ translateY: translateYAnim }],
        },
      ]}
    >
      <Ionicons
        name={currentTheme.icon}
        size={22}
        color={currentTheme.color}
        style={styles.icon}
      />
      <View style={styles.textContainer}>
        {item.title ? <Text style={styles.titleText}>{item.title}</Text> : null}
        <Text style={styles.messageText}>{item.message}</Text>
      </View>
      {item.action ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            item.action?.onPress();
            handleDismiss();
          }}
          style={styles.actionBtn}
        >
          <Text style={[styles.actionBtnText, { color: currentTheme.color }]}>
            {item.action.label}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close notification"
        onPress={handleDismiss}
        style={styles.closeBtn}
      >
        <Ionicons name="close" size={18} color="#64748B" />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: Platform.OS === "web" ? 16 : 48,
    left: 0,
    right: 0,
    zIndex: 999999,
    alignItems: "center",
  },
  toastList: {
    width: "100%",
    maxWidth: 480,
    paddingHorizontal: 16,
    gap: 8,
  },
  toastCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 8px rgba(15, 23, 42, 0.12)" } : {}),
  },
  icon: {
    marginEnd: 10,
  },
  textContainer: {
    flex: 1,
  },
  titleText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  messageText: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "500",
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginEnd: 6,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 4,
    marginStart: 6,
  },
});
