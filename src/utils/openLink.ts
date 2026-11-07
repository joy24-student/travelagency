import { Linking, Platform, Alert } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { copyToClipboard } from "./clipboard";
import { toast } from "../components/ui/Toast";

export interface OpenLinkOptions {
  /** Optional human label for the target (e.g. "হটলাইন নম্বর", "WhatsApp", "ম্যাপ") */
  label?: string;
  /** Explicit value to copy to clipboard on failure (e.g. raw phone number) */
  copyValue?: string;
  /** Custom fallback message shown on failure */
  fallbackMessage?: string;
  /** Whether to automatically copy to clipboard when opening fails (default: true) */
  autoCopyOnFailure?: boolean;
  /** Whether to show a dialog alert in addition to toast on failure (default: true for phone calls) */
  showAlertOnFailure?: boolean;
}

/**
 * Universal Safe Link & App Launcher
 * 
 * Safely opens URLs (tel, WhatsApp, maps, mailto, http/https).
 * If the target app is not installed or opening fails, it gracefully handles
 * the failure by copying the number/target to clipboard and alerting the user:
 * "অ্যাপ নেই, নম্বর কপি করুন" / "কল করার অ্যাপ নেই, নম্বর কপি করা হয়েছে".
 */
export async function openLink(
  url: string,
  options?: OpenLinkOptions
): Promise<boolean> {
  if (!url || typeof url !== "string") {
    toast.error("অবৈধ লিংক");
    return false;
  }

  const trimmedUrl = url.trim();
  const autoCopy = options?.autoCopyOnFailure !== false;

  // ---------------------------------------------------------------------------
  // 1. Phone Call Handler (tel:+880...)
  // ---------------------------------------------------------------------------
  if (trimmedUrl.startsWith("tel:")) {
    const rawNumber = trimmedUrl.replace(/^tel:/i, "").replace(/[^\d+]/g, "");
    const numberToCopy = options?.copyValue || rawNumber;

    try {
      const canOpen = await Linking.canOpenURL(trimmedUrl).catch(() => false);
      if (canOpen) {
        await Linking.openURL(trimmedUrl);
        return true;
      }
    } catch (err) {
      console.warn("[openLink] Failed to trigger tel scheme:", err);
    }

    // Fallback: No dialer app or failed
    if (autoCopy && numberToCopy) {
      await copyToClipboard(numberToCopy, {
        silent: true,
      });
    }

    const failMsg =
      options?.fallbackMessage ||
      `কল করার অ্যাপ নেই, নম্বর কপি করা হয়েছে: ${numberToCopy}`;
    toast.warning(failMsg, { duration: 4000 });

    if (options?.showAlertOnFailure !== false) {
      Alert.alert(
        "অ্যাপ নেই",
        `এই ডিভাইসে কল করার মতো কোনো ডায়ালার অ্যাপ পাওয়া যায়নি। নম্বরটি (${numberToCopy}) ক্লিপবোর্ডে কপি করা হয়েছে।`,
        [
          {
            text: "নম্বর কপি করুন",
            onPress: () => copyToClipboard(numberToCopy, { label: "নম্বর" }),
          },
          { text: "ঠিক আছে", style: "cancel" },
        ]
      );
    }

    return false;
  }

  // ---------------------------------------------------------------------------
  // 2. WhatsApp Handler (whatsapp:// or https://wa.me/...)
  // ---------------------------------------------------------------------------
  if (trimmedUrl.includes("wa.me") || trimmedUrl.startsWith("whatsapp://")) {
    let extractedPhone = options?.copyValue || "";
    if (!extractedPhone) {
      const match = trimmedUrl.match(/(?:wa\.me\/|phone=)(\+?\d+)/);
      if (match) extractedPhone = match[1];
    }

    try {
      const canOpen = await Linking.canOpenURL(trimmedUrl).catch(() => false);
      if (canOpen) {
        await Linking.openURL(trimmedUrl);
        return true;
      }
    } catch (err) {
      console.warn("[openLink] WhatsApp open failed:", err);
    }

    // Try web fallback if scheme was whatsapp://
    if (trimmedUrl.startsWith("whatsapp://") && extractedPhone) {
      try {
        const webUrl = `https://wa.me/${extractedPhone.replace(/[^\d]/g, "")}`;
        const canWeb = await Linking.canOpenURL(webUrl).catch(() => false);
        if (canWeb) {
          await Linking.openURL(webUrl);
          return true;
        }
      } catch {
        // Fall through
      }
    }

    if (autoCopy && extractedPhone) {
      await copyToClipboard(extractedPhone, { silent: true });
    }

    toast.warning(
      `WhatsApp অ্যাপ নেই, নম্বর কপি করা হয়েছে: ${extractedPhone || "ফোন নম্বর"}`,
      { duration: 4000 }
    );

    if (options?.showAlertOnFailure !== false && extractedPhone) {
      Alert.alert(
        "WhatsApp পাওয়া যায়নি",
        `আপনার ডিভাইসে WhatsApp ইনস্টল করা নেই। নম্বরটি (${extractedPhone}) কপি করা হয়েছে।`,
        [
          {
            text: "নম্বর কপি করুন",
            onPress: () => copyToClipboard(extractedPhone, { label: "নম্বর" }),
          },
          { text: "ঠিক আছে", style: "cancel" },
        ]
      );
    }

    return false;
  }

  // ---------------------------------------------------------------------------
  // 3. Map & Navigation Handler (geo:, maps:, google.navigation:)
  // ---------------------------------------------------------------------------
  if (
    trimmedUrl.startsWith("geo:") ||
    trimmedUrl.startsWith("maps:") ||
    trimmedUrl.includes("maps.google.com") ||
    trimmedUrl.includes("google.com/maps")
  ) {
    try {
      const canOpen = await Linking.canOpenURL(trimmedUrl).catch(() => false);
      if (canOpen) {
        await Linking.openURL(trimmedUrl);
        return true;
      }
    } catch (err) {
      console.warn("[openLink] Map scheme failed:", err);
    }

    // If native geo: or maps: failed, try web Google Maps
    if (!trimmedUrl.startsWith("http")) {
      const queryMatch = trimmedUrl.match(/q=([^&]+)/);
      const query = queryMatch ? queryMatch[1] : trimmedUrl.replace(/^geo:0,0\?q=/, "");
      const webMap = `https://www.google.com/maps/search/?api=1&query=${query}`;
      try {
        const canWeb = await Linking.canOpenURL(webMap).catch(() => false);
        if (canWeb) {
          await Linking.openURL(webMap);
          return true;
        }
      } catch {
        // Fall through
      }
    }

    const locToCopy = options?.copyValue || trimmedUrl;
    if (autoCopy) {
      await copyToClipboard(locToCopy, { silent: true });
    }

    toast.warning("ম্যাপ অ্যাপ খোলা যায়নি, লোকেশন কপি করা হয়েছে");
    return false;
  }

  // ---------------------------------------------------------------------------
  // 4. Email Handler (mailto:...)
  // ---------------------------------------------------------------------------
  if (trimmedUrl.startsWith("mailto:")) {
    const rawEmail = trimmedUrl.replace(/^mailto:/i, "").split("?")[0];
    const emailToCopy = options?.copyValue || rawEmail;

    try {
      const canOpen = await Linking.canOpenURL(trimmedUrl).catch(() => false);
      if (canOpen) {
        await Linking.openURL(trimmedUrl);
        return true;
      }
    } catch (err) {
      console.warn("[openLink] Mailto failed:", err);
    }

    if (autoCopy && emailToCopy) {
      await copyToClipboard(emailToCopy, { silent: true });
    }

    toast.warning(`ইমেইল অ্যাপ নেই, ঠিকানা কপি করা হয়েছে: ${emailToCopy}`);
    return false;
  }

  // ---------------------------------------------------------------------------
  // 5. Standard Web Links (http://, https://)
  // ---------------------------------------------------------------------------
  try {
    const canOpen = await Linking.canOpenURL(trimmedUrl).catch(() => false);
    if (canOpen) {
      await Linking.openURL(trimmedUrl);
      return true;
    }
  } catch {
    // Try WebBrowser as fallback
  }

  try {
    const res = await WebBrowser.openBrowserAsync(trimmedUrl);
    if (res.type !== "cancel") {
      return true;
    }
  } catch {
    // WebBrowser failed
  }

  // Final fallback: copy link
  if (autoCopy) {
    await copyToClipboard(options?.copyValue || trimmedUrl, { silent: true });
  }
  toast.warning("ব্রাউজার খোলা যায়নি, লিংকটি কপি করা হয়েছে");
  return false;
}

export default openLink;
