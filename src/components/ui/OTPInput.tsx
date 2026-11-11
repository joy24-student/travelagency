import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  StyleProp,
  ViewStyle,
  TextStyle,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";

export interface OTPInputProps {
  length?: 4 | 6 | 8;
  value: string;
  onChangeText: (code: string) => void;
  onComplete?: (code: string) => void;
  error?: string | null;
  disabled?: boolean;
  autoFocus?: boolean;
  supportsAlpha?: boolean; // Useful for Supabase alphanumeric token hashes
  containerStyle?: StyleProp<ViewStyle>;
  cellStyle?: StyleProp<ViewStyle>;
  cellTextStyle?: StyleProp<TextStyle>;
  showPasteButton?: boolean;
}

export const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  value,
  onChangeText,
  onComplete,
  error,
  disabled = false,
  autoFocus = true,
  supportsAlpha = false,
  containerStyle,
  cellStyle,
  cellTextStyle,
  showPasteButton = true,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Focus input automatically if autoFocus is true
  useEffect(() => {
    if (autoFocus && !disabled) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [autoFocus, disabled]);

  // Clean and filter code input
  const handleTextChange = (text: string) => {
    const filterRegex = supportsAlpha ? /[^a-zA-Z0-9]/g : /[^0-9]/g;
    const sanitized = text.replace(filterRegex, "").slice(0, length);
    onChangeText(sanitized);

    if (Platform.OS !== "web" && sanitized.length > value.length) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }

    if (sanitized.length === length) {
      if (Platform.OS !== "web") {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }
      onComplete?.(sanitized);
    }
  };

  const handleContainerPress = () => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  };

  // Dynamically compute responsive cell width and gap to prevent wrapping on small phones
  // (e.g. 320px - 375px screens)
  const isEightDigit = length === 8;
  const horizontalPadding = 48; // Total screen/card padding
  const availableWidth = Math.max(260, screenWidth - horizontalPadding);
  const gap = isEightDigit ? (screenWidth < 380 ? 4 : 6) : 8;
  const maxCellWidth = isEightDigit ? 38 : 50;
  const computedCellWidth = Math.min(
    maxCellWidth,
    Math.floor((availableWidth - (length - 1) * gap) / length)
  );
  const cellHeight = isEightDigit ? Math.max(46, computedCellWidth * 1.25) : 56;

  // Split digits into array
  const codeChars = value.split("");

  return (
    <View style={[styles.rootContainer, containerStyle]}>
      {/* Invisible actual TextInput for SMS Auto-Read and Clipboard Paste */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleTextChange}
        maxLength={length}
        keyboardType={supportsAlpha ? "default" : "number-pad"}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        autoCapitalize={supportsAlpha ? "characters" : "none"}
        autoCorrect={false}
        editable={!disabled}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={styles.hiddenInput}
        caretHidden
        accessibilityLabel={`Verification code, ${length} digits`}
        accessibilityHint="SMS auto-fill and paste are supported"
        returnKeyType="done"
      />

      {/* Visual Digit Cells */}
      <Pressable
        onPress={handleContainerPress}
        style={[
          styles.cellsContainer,
          { gap },
        ]}
        accessibilityRole="none"
      >
        {Array.from({ length }).map((_, index) => {
          const char = codeChars[index] || "";
          const isCurrentActive = isFocused && index === codeChars.length;
          const isFilled = Boolean(char);

          // Add a subtle middle separator for 8-digit codes (4 - 4 split)
          const isMiddleSeparator = isEightDigit && index === 3;

          return (
            <React.Fragment key={index}>
              <View
                style={[
                  styles.cell,
                  {
                    width: computedCellWidth,
                    height: cellHeight,
                  },
                  isFilled && styles.cellFilled,
                  isCurrentActive && styles.cellFocused,
                  Boolean(error) && styles.cellError,
                  disabled && styles.cellDisabled,
                  cellStyle,
                ]}
              >
                <Text
                  style={[
                    styles.cellText,
                    isEightDigit && styles.cellTextSmall,
                    cellTextStyle,
                  ]}
                >
                  {char}
                </Text>

                {/* Animated active cursor dot/line when empty and focused */}
                {isCurrentActive && !char && (
                  <View style={styles.activeCursor} />
                )}
              </View>

              {isMiddleSeparator && (
                <View style={styles.separatorContainer}>
                  <Text style={styles.separatorText}>-</Text>
                </View>
              )}
            </React.Fragment>
          );
        })}
      </Pressable>

      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle"
            size={14}
            color={colors.status.danger.main}
            style={{ marginEnd: 4 }}
          />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
  },
  hiddenInput: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
    zIndex: 10,
  },
  cellsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "nowrap",
    width: "100%",
  },
  cell: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  cellFilled: {
    borderColor: colors.brand.trip.blue,
    backgroundColor: colors.neutral[0],
  },
  cellFocused: {
    borderColor: colors.brand.trip.blue,
    backgroundColor: colors.neutral[0],
    shadowColor: colors.brand.trip.blue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  cellError: {
    borderColor: colors.status.danger.main,
    backgroundColor: colors.status.danger.light,
  },
  cellDisabled: {
    backgroundColor: colors.neutral[100],
    borderColor: colors.border.subtle,
    opacity: 0.5,
  },
  cellText: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text.primary,
    textAlign: "center",
  },
  cellTextSmall: {
    fontSize: 18,
    fontWeight: "700",
  },
  activeCursor: {
    position: "absolute",
    bottom: 8,
    width: 14,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: colors.brand.trip.blue,
  },
  separatorContainer: {
    paddingHorizontal: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  separatorText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text.muted,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: colors.status.danger.dark,
    fontWeight: "500",
  },
});
