import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { Button } from "./Button";

export type DialogType = "info" | "success" | "warning" | "danger" | "confirm";

export interface DialogButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

export interface DialogOptions {
  id?: string;
  title: string;
  message?: string;
  type?: DialogType;
  buttons?: DialogButton[];
  cancelable?: boolean;
  onDismiss?: () => void;
}

type DialogListener = (dialog: DialogOptions | null) => void;

class DialogManager {
  private currentDialog: DialogOptions | null = null;
  private listeners: Set<DialogListener> = new Set();

  subscribe(listener: DialogListener) {
    this.listeners.add(listener);
    listener(this.currentDialog);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.currentDialog));
  }

  show(options: DialogOptions) {
    this.currentDialog = options;
    this.notify();
  }

  alert(
    title: string,
    message?: string,
    buttons?: DialogButton[],
    options?: { cancelable?: boolean; type?: DialogType }
  ) {
    const defaultButtons: DialogButton[] = [
      { text: "OK", style: "default" },
    ];
    this.show({
      title,
      message,
      buttons: buttons && buttons.length > 0 ? buttons : defaultButtons,
      cancelable: options?.cancelable ?? true,
      type: options?.type ?? "info",
    });
  }

  confirm(
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    options?: {
      confirmText?: string;
      cancelText?: string;
      type?: DialogType;
    }
  ) {
    this.show({
      title,
      message,
      type: options?.type ?? "confirm",
      cancelable: true,
      buttons: [
        {
          text: options?.cancelText ?? "Cancel",
          style: "cancel",
          onPress: onCancel,
        },
        {
          text: options?.confirmText ?? "Confirm",
          style: options?.type === "danger" ? "destructive" : "default",
          onPress: onConfirm,
        },
      ],
    });
  }

  dismiss() {
    if (this.currentDialog) {
      this.currentDialog.onDismiss?.();
      this.currentDialog = null;
      this.notify();
    }
  }
}

export const dialog = new DialogManager();

export const DialogContainer: React.FC = () => {
  const [activeDialog, setActiveDialog] = useState<DialogOptions | null>(null);

  useEffect(() => {
    return dialog.subscribe(setActiveDialog);
  }, []);

  if (!activeDialog) return null;

  const handleClose = () => {
    if (activeDialog.cancelable !== false) {
      dialog.dismiss();
    }
  };

  const getIcon = () => {
    switch (activeDialog.type) {
      case "danger":
        return {
          name: "alert-circle" as const,
          color: colors.status.danger.main,
          bg: "#FEF2F2",
        };
      case "warning":
        return {
          name: "warning" as const,
          color: colors.status.warning.main,
          bg: "#FFFBEB",
        };
      case "success":
        return {
          name: "checkmark-circle" as const,
          color: colors.status.success.main,
          bg: "#F0FDF4",
        };
      case "confirm":
        return {
          name: "help-circle" as const,
          color: colors.brand.trip.blue,
          bg: "#EFF6FF",
        };
      case "info":
      default:
        return {
          name: "information-circle" as const,
          color: colors.brand.trip.blue,
          bg: "#EFF6FF",
        };
    }
  };

  const iconInfo = getIcon();
  const buttons = activeDialog.buttons || [{ text: "OK", style: "default" }];

  return (
    <Modal
      transparent
      visible={true}
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={styles.dialogCard}
              accessibilityRole="alert"
              
            >
              <View
                style={[styles.iconWrapper, { backgroundColor: iconInfo.bg }]}
              >
                <Ionicons
                  name={iconInfo.name}
                  size={32}
                  color={iconInfo.color}
                />
              </View>

              <Text style={styles.title}>{activeDialog.title}</Text>
              {activeDialog.message ? (
                <Text style={styles.message}>{activeDialog.message}</Text>
              ) : null}

              <View
                style={[
                  styles.buttonRow,
                  buttons.length > 2 && styles.buttonColumn,
                ]}
              >
                {buttons.map((btn, index) => {
                  const isCancel = btn.style === "cancel";
                  const isDestructive = btn.style === "destructive";

                  return (
                    <Button
                      key={index}
                      label={btn.text}
                      variant={
                        isDestructive
                          ? "danger"
                          : isCancel
                          ? "outline"
                          : "primary"
                      }
                      size="md"
                      style={[
                        styles.dialogBtn,
                        buttons.length === 2 && styles.dialogBtnHalf,
                        buttons.length > 2 && styles.dialogBtnFull,
                      ]}
                      onPress={() => {
                        dialog.dismiss();
                        btn.onPress?.();
                      }}
                    />
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(4px)",
        }
      : {}),
  },
  dialogCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
    ...(Platform.OS === "web" ? { boxShadow: "0px 10px 20px rgba(15, 23, 42, 0.25)" } : {}),
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: "#475569",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  buttonColumn: {
    flexDirection: "column",
    gap: 8,
  },
  dialogBtn: {
    flex: 1,
  },
  dialogBtnHalf: {
    flex: 1,
  },
  dialogBtnFull: {
    width: "100%",
  },
});
