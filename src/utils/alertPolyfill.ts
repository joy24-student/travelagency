import { Alert, Platform } from "react-native";
import { AppAlert } from "./alert";

let isPolyfilled = false;

/**
 * Initializes the branded Alert polyfill for React Native & Web.
 * Replaces unbranded native alerts and Web window.alert with
 * accessible, theme-compliant custom Dialogs.
 */
export function initAlertPolyfill() {
  if (isPolyfilled) return;

  const originalAlert = Alert.alert;

  Alert.alert = (
    title: string,
    message?: string,
    buttons?: any[],
    options?: any
  ) => {
    try {
      AppAlert.alert(title, message, buttons, options);
    } catch (err) {
      // Safe fallback if called before React subtree or Dialog is ready
      if (originalAlert) {
        originalAlert(title, message, buttons, options);
      }
    }
  };

  isPolyfilled = true;
}
