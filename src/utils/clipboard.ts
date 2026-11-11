import { Clipboard, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { toast } from "../components/ui/Toast";

export interface CopyOptions {
  toastMessage?: string;
  label?: string;
  silent?: boolean;
}

/**
 * Universal Clipboard Copy Helper
 * Copies string to clipboard across Mobile & Web, triggers haptic feedback,
 * and displays a localized success toast notification.
 */
export async function copyToClipboard(
  text: string,
  options?: CopyOptions
): Promise<boolean> {
  if (!text || typeof text !== "string") {
    return false;
  }

  const cleanText = text.trim();
  if (!cleanText) return false;

  try {
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(cleanText);
    } else {
      Clipboard.setString(cleanText);
    }

    // Trigger subtle success haptic
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    if (!options?.silent) {
      const msg =
        options?.toastMessage ||
        (options?.label ? `${options.label} কপি হয়েছে` : "কপি হয়েছে");
      toast.success(msg, { duration: 2500 });
    }

    return true;
  } catch (error) {
    console.warn("[Clipboard] Failed to copy text:", error);
    // Fallback try
    try {
      Clipboard.setString(cleanText);
      if (!options?.silent) {
        toast.success(options?.toastMessage || "কপি হয়েছে", { duration: 2500 });
      }
      return true;
    } catch {
      return false;
    }
  }
}
