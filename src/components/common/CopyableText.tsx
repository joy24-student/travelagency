import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { copyToClipboard } from "../../utils/clipboard";

export interface CopyableTextProps {
  /** The raw text to copy to clipboard */
  text: string;
  /** Custom display text (defaults to `text`) */
  displayValue?: string;
  /** Human label for toast feedback (e.g., "বুকিং আইডি", "PNR", "ট্রানজ্যাকশন আইডি") */
  label?: string;
  /** Custom toast message on copy */
  toastMessage?: string;
  /** Text style */
  textStyle?: StyleProp<TextStyle>;
  /** Container layout style */
  containerStyle?: StyleProp<ViewStyle>;
  /** Icon size (default: 15) */
  iconSize?: number;
  /** Icon color (default: '#0055F2') */
  iconColor?: string;
  /** Whether to show the copy icon button */
  showCopyButton?: boolean;
  /** Whether the text itself is natively selectable by long-press */
  selectable?: boolean;
  /** Number of lines before truncation */
  numberOfLines?: number;
}

/**
 * CopyableText Component
 * Renders selectable text with an adjacent high-contrast copy button
 * that copies the identifier (PNR, Booking ID, voucher code) and shows
 * an instant localized "কপি হয়েছে" toast.
 */
export const CopyableText: React.FC<CopyableTextProps> = ({
  text,
  displayValue,
  label,
  toastMessage,
  textStyle,
  containerStyle,
  iconSize = 15,
  iconColor = "#0055F2",
  showCopyButton = true,
  selectable = true,
  numberOfLines,
}) => {
  const handleCopy = () => {
    copyToClipboard(text, { label, toastMessage });
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <Text
        selectable={selectable}
        numberOfLines={numberOfLines}
        style={[styles.text, textStyle]}
      >
        {displayValue ?? text}
      </Text>
      {showCopyButton && (
        <TouchableOpacity
          onPress={handleCopy}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.copyBtn}
          accessibilityLabel={`Copy ${label || text}`}
          accessibilityRole="button"
          activeOpacity={0.65}
        >
          <Ionicons name="copy-outline" size={iconSize} color={iconColor} />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default CopyableText;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  text: {
    fontSize: 14,
    color: "#0F172A",
  },
  copyBtn: {
    marginStart: 6,
    padding: 3,
    borderRadius: 4,
    backgroundColor: "rgba(0, 85, 242, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
});
