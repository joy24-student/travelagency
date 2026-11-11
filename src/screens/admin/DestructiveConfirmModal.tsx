/**
 * DestructiveConfirmModal.tsx
 *
 * Enhanced High-Security Destructive Action Confirmation Modal for Admin Portal.
 * Enforces:
 * 1. Double-confirmation via typed action keyword (e.g. "DELETE", "BAN", "TERMINATE").
 * 2. Mandatory or optional compliance reason logging.
 * 3. Audit trail reference ID tracking.
 * 4. Distinct severity styling (Danger vs Warning).
 */

import React, { useState, useEffect, useRef } from "react";
import { Platform,
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Clipboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

export interface DestructiveConfirmModalProps {
  visible: boolean;
  title: string;
  description: string;
  targetName?: string;
  targetId?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
  severity?: "danger" | "warning";
  /** Require user to type confirmationWord (e.g. "DELETE") before confirming */
  requireTypedConfirmation?: boolean;
  confirmationWord?: string;
  /** Require reason input for administrative audit logs */
  requireReason?: boolean;
  reasonPlaceholder?: string;
  /** Audit log tracking reference ID */
  auditLogRef?: string;
}

export const DestructiveConfirmModal: React.FC<DestructiveConfirmModalProps> = ({
  visible,
  title,
  description,
  targetName,
  targetId,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isLoading = false,
  severity = "danger",
  requireTypedConfirmation = false,
  confirmationWord = "DELETE",
  requireReason = false,
  reasonPlaceholder = "Enter audit reason for this action...",
  auditLogRef,
}) => {
  const [typedWord, setTypedWord] = useState("");
  const [reason, setReason] = useState("");
  const [copiedAuditRef, setCopiedAuditRef] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  // Reset inputs when modal opens or closes
  useEffect(() => {
    if (visible) {
      setTypedWord("");
      setReason("");
      setCopiedAuditRef(false);
    }
  }, [visible]);

  const isDanger = severity === "danger";
  const primaryColor = isDanger ? "#DC2626" : "#D97706";
  const iconBgColor = isDanger ? "#FEE2E2" : "#FEF3C7";
  const iconName = isDanger ? "alert-circle" : "warning";

  // Validate typed word
  const targetWordUpper = confirmationWord.trim().toUpperCase();
  const isWordMatch = !requireTypedConfirmation || typedWord.trim().toUpperCase() === targetWordUpper;
  const isReasonValid = !requireReason || reason.trim().length >= 4;
  const canConfirm = isWordMatch && isReasonValid && !isLoading;

  const handleConfirmPress = () => {
    if (!canConfirm) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onConfirm(reason.trim());
  };

  const handleCopyAuditRef = () => {
    if (!auditLogRef) return;
    Clipboard.setString(auditLogRef);
    setCopiedAuditRef(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopiedAuditRef(false), 2000);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Top Warning Icon */}
          <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
            <Ionicons name={iconName} size={36} color={primaryColor} />
          </View>

          {/* Title & Description */}
          <Text style={styles.titleText}>{title}</Text>
          <Text style={styles.descriptionText}>{description}</Text>

          {/* Target Metadata Pill */}
          {(targetName || targetId) && (
            <View style={styles.targetPill}>
              {targetName && (
                <Text style={styles.targetNameText} numberOfLines={1}>
                  {targetName}
                </Text>
              )}
              {targetId && (
                <Text style={styles.targetIdText}>ID: {targetId}</Text>
              )}
            </View>
          )}

          {/* Optional Reason Field */}
          {requireReason && (
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>
                Audit Reason <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={styles.reasonInput}
                placeholder={reasonPlaceholder}
                placeholderTextColor="#94A3B8"
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={2}
              />
            </View>
          )}

          {/* Typed Word Confirmation Field */}
          {requireTypedConfirmation && (
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>
                To confirm, type <Text style={styles.keywordHighlight}>{targetWordUpper}</Text> below:
              </Text>
              <TextInput
                style={[
                  styles.confirmWordInput,
                  typedWord.trim().length > 0 && !isWordMatch && styles.inputErrorBorder,
                  isWordMatch && typedWord.length > 0 && styles.inputSuccessBorder,
                ]}
                placeholder={`Type "${targetWordUpper}"`}
                placeholderTextColor="#94A3B8"
                value={typedWord}
                onChangeText={setTypedWord}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>
          )}

          {/* Audit Log Trail Info */}
          {auditLogRef && (
            <TouchableOpacity
              style={styles.auditLogInfoRow}
              onPress={handleCopyAuditRef}
              activeOpacity={0.7}
            >
              <Ionicons name="lock-closed-outline" size={13} color="#64748B" />
              <Text style={styles.auditLogRefText} numberOfLines={1}>
                Audit Log Ref: {auditLogRef}
              </Text>
              <Ionicons
                name={copiedAuditRef ? "checkmark" : "copy-outline"}
                size={13}
                color={copiedAuditRef ? "#16A34A" : "#64748B"}
              />
            </TouchableOpacity>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>{cancelLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                { backgroundColor: primaryColor },
                !canConfirm && styles.confirmBtnDisabled,
              ]}
              onPress={handleConfirmPress}
              disabled={!canConfirm}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmBtnText}>{confirmLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    ...(Platform.OS === "web" ? { boxShadow: "0px 10px 20px rgba(15, 23, 42, 0.15)" } : {}),
  },
  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  titleText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  targetPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
    maxWidth: "100%",
  },
  targetNameText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  targetIdText: {
    fontSize: 11,
    fontFamily: "monospace",
    color: "#64748B",
  },
  inputSection: {
    width: "100%",
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  requiredStar: {
    color: "#DC2626",
  },
  keywordHighlight: {
    color: "#DC2626",
    fontWeight: "800",
    fontFamily: "monospace",
  },
  confirmWordInput: {
    width: "100%",
    height: 44,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
  },
  reasonInput: {
    width: "100%",
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
    textAlignVertical: "top",
  },
  inputErrorBorder: {
    borderColor: "#F87171",
  },
  inputSuccessBorder: {
    borderColor: "#4ADE80",
  },
  auditLogInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
    width: "100%",
    justifyContent: "center",
  },
  auditLogRefText: {
    fontSize: 11,
    color: "#64748B",
    fontFamily: "monospace",
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  confirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmBtnDisabled: {
    opacity: 0.45,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

export default DestructiveConfirmModal;
