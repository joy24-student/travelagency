import { Alert as RNAlert, AlertButton, AlertOptions } from "react-native";
import { dialog, DialogButton, DialogType } from "../components/ui/Dialog";
import { toast, ToastType } from "../components/ui/Toast";

export class AppAlert {
  /**
   * Drop-in replacement for React Native's Alert.alert
   * Automatically presents a branded, accessible, web-friendly modal dialog.
   */
  static alert(
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions
  ): void {
    const dialogButtons: DialogButton[] = (buttons && buttons.length > 0)
      ? buttons.map((b) => ({
          text: b.text || "OK",
          onPress: b.onPress,
          style:
            b.style === "destructive"
              ? "destructive"
              : b.style === "cancel"
              ? "cancel"
              : "default",
        }))
      : [{ text: "OK", style: "default" }];

    // Auto-detect type based on title or button style
    let type: DialogType = "info";
    const lowerTitle = (title || "").toLowerCase();
    const hasDestructive = dialogButtons.some((b) => b.style === "destructive");

    if (
      hasDestructive ||
      lowerTitle.includes("delete") ||
      lowerTitle.includes("remove") ||
      lowerTitle.includes("error") ||
      lowerTitle.includes("failed")
    ) {
      type = "danger";
    } else if (
      lowerTitle.includes("success") ||
      lowerTitle.includes("complete") ||
      lowerTitle.includes("verified")
    ) {
      type = "success";
    } else if (
      lowerTitle.includes("warning") ||
      lowerTitle.includes("attention") ||
      lowerTitle.includes("caution")
    ) {
      type = "warning";
    } else if (dialogButtons.length > 1) {
      type = "confirm";
    }

    dialog.show({
      title,
      message,
      buttons: dialogButtons,
      cancelable: options?.cancelable ?? true,
      onDismiss: options?.onDismiss,
      type,
    });
  }

  /**
   * Convenient helper for branded confirmation prompts
   */
  static confirm(
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    options?: {
      confirmText?: string;
      cancelText?: string;
      type?: DialogType;
    }
  ): void {
    dialog.confirm(title, message, onConfirm, onCancel, options);
  }

  /**
   * Non-blocking Toast notification helper
   */
  static toast(message: string, type: ToastType = "info"): string {
    return toast.show({ message, type });
  }

  static success(message: string): string {
    return toast.success(message);
  }

  static error(message: string): string {
    return toast.error(message);
  }

  static warning(message: string): string {
    return toast.warning(message);
  }

  static info(message: string): string {
    return toast.info(message);
  }
}

export default AppAlert;
