import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  Pressable,
  Animated,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { z } from "zod";
import { useTheme } from "../../context/ThemeContext";
import { colors } from "../../theme/colors";
import { hitSlopPresets } from "../../theme/spacing";
import { FONTS } from "../../theme/typography";
import { getLocalizedValidationError, getLocalizedPlaceholder } from "../../utils/validation";
import i18n from "../../locales/i18n";

import { PasswordStrengthMeter } from "./PasswordStrengthMeter";
import { maskBangladeshiPhone, maskCurrencyInput } from "../../utils/masking";

export type InputMaskType = "phone" | "currency" | "number" | "none";

export interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  required?: boolean;
  floatingLabel?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
  isNewPassword?: boolean;
  showStrengthMeter?: boolean;
  mask?: InputMaskType;
  error?: string | null;
  helperText?: string;
  schema?: z.ZodTypeAny;
  validateOnBlur?: boolean;
  onValidate?: (isValid: boolean, error?: string) => void;
  containerClassName?: string;
  inputClassName?: string;
  labelClassName?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  labelStyle?: StyleProp<TextStyle>;
  errorStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  (
    {
      label,
      floatingLabel = true,
      leftIcon,
      rightIcon,
      isPassword = false,
      isNewPassword = false,
      showStrengthMeter = false,
      mask,
      error: externalError,
      helperText,
      schema,
      validateOnBlur = true,
      onValidate,
      containerClassName,
      inputClassName,
      labelClassName,
      containerStyle,
      inputStyle,
      labelStyle,
      errorStyle,
      disabled = false,
      required,
      value,
      defaultValue,
      onChangeText,
      onFocus,
      onBlur,
      placeholder,
      secureTextEntry,
      ...rest
    },
    ref
  ) => {
    const { colors: themeColors, isDark } = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const [secureVisible, setSecureVisible] = useState(false);
    const [internalError, setInternalError] = useState<string | null>(null);
    const [currentValue, setCurrentValue] = useState(value || defaultValue || "");

    const rawError = externalError !== undefined ? externalError : internalError;
    const activeError = rawError ? getLocalizedValidationError(rawError) : null;
    const localizedPlaceholder = getLocalizedPlaceholder(placeholder);
    const localizedLabel = label ? i18n.t(label, { defaultValue: label }) : undefined;
    const effectiveLabel = localizedLabel || localizedPlaceholder;
    const hasValue = currentValue.length > 0;
    const isFloating = floatingLabel && (isFocused || hasValue);

    // Resolve active mask
    const effectiveMask: InputMaskType = (() => {
      if (mask) return mask;
      const lower = (effectiveLabel || "").toLowerCase();
      if (rest.keyboardType === "phone-pad" || lower.includes("phone") || lower.includes("mobile") || lower.includes("ফোন")) {
        return "phone";
      }
      if (lower.includes("amount") || lower.includes("budget") || lower.includes("price") || lower.includes("টাকা") || lower.includes("দাম")) {
        return "currency";
      }
      return "none";
    })();

    // Smart AutoFill inference based on field context, names and types
    const inferAutofill = () => {
      const labelText = (effectiveLabel || "").toLowerCase();
      if (isPassword || secureTextEntry) {
        const isNew = isNewPassword || labelText.includes("new") || labelText.includes("create") || labelText.includes("confirm");
        return {
          autoComplete: rest.autoComplete || (isNew ? ("new-password" as const) : ("current-password" as const)),
          textContentType: rest.textContentType || (isNew ? ("newPassword" as const) : ("password" as const)),
        };
      }
      if (rest.keyboardType === "email-address" || labelText.includes("email")) {
        return {
          autoComplete: rest.autoComplete || ("email" as const),
          textContentType: rest.textContentType || ("emailAddress" as const),
        };
      }
      if (labelText.includes("otp") || labelText.includes("code") || labelText.includes("token") || labelText.includes("verification")) {
        return {
          autoComplete: rest.autoComplete || ("one-time-code" as const),
          textContentType: rest.textContentType || ("oneTimeCode" as const),
        };
      }
      if (rest.keyboardType === "phone-pad" || labelText.includes("phone") || labelText.includes("mobile")) {
        return {
          autoComplete: rest.autoComplete || ("tel" as const),
          textContentType: rest.textContentType || ("telephoneNumber" as const),
        };
      }
      if (labelText.includes("name") && !labelText.includes("user")) {
        return {
          autoComplete: rest.autoComplete || ("name" as const),
          textContentType: rest.textContentType || ("name" as const),
        };
      }
      if (labelText.includes("user") || labelText.includes("username")) {
        return {
          autoComplete: rest.autoComplete || ("username" as const),
          textContentType: rest.textContentType || ("username" as const),
        };
      }
      return {
        autoComplete: rest.autoComplete,
        textContentType: rest.textContentType,
      };
    };

    const autofillProps = inferAutofill();

    // Floating label animated position and font size
    const labelAnim = useRef(new Animated.Value(hasValue ? 1 : 0)).current;

    useEffect(() => {
      Animated.timing(labelAnim, {
        toValue: isFloating ? 1 : 0,
        duration: 150,
        useNativeDriver: false,
      }).start();
    }, [isFloating, labelAnim]);

    useEffect(() => {
      if (value !== undefined) {
        setCurrentValue(value);
      }
    }, [value]);

    const handleTextChange = (text: string) => {
      let formattedText = text;
      if (effectiveMask === "phone") {
        formattedText = maskBangladeshiPhone(text);
      } else if (effectiveMask === "currency" || effectiveMask === "number") {
        formattedText = maskCurrencyInput(text);
      }

      setCurrentValue(formattedText);
      if (internalError) {
        setInternalError(null);
      }
      onChangeText?.(formattedText);
    };

    const validateValue = (text: string) => {
      if (!schema) return;
      const result = schema.safeParse(text);
      if (!result.success) {
        const errorMsg = result.error.issues?.[0]?.message || "Invalid input";
        setInternalError(errorMsg);
        onValidate?.(false, errorMsg);
      } else {
        setInternalError(null);
        onValidate?.(true);
      }
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);
      if (validateOnBlur) {
        validateValue(currentValue);
      }
      onBlur?.(e);
    };

    const handleFocus = (e: any) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const togglePasswordVisibility = async () => {
      if (Platform.OS !== "web") {
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (hapticErr) {
          if (__DEV__) console.warn("[Input] Haptics unavailable:", hapticErr);
        }
      }
      setSecureVisible((prev) => !prev);
    };

    // Interpolate animated label style
    const animatedLabelStyle = floatingLabel
      ? {
          top: labelAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [15, 6],
          }),
          fontSize: labelAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [15, 11],
          }),
          color: labelAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [colors.text.muted, isFocused ? colors.brand.trip.blue : colors.text.secondary],
          }),
        }
      : null;

    return (
      <View className={containerClassName} style={[styles.wrapper, containerStyle]}>
        {localizedLabel && !floatingLabel ? (
          <Text
            className={labelClassName}
            style={[
              styles.staticLabel,
              { color: themeColors.text, fontFamily: FONTS.bengali.medium },
              !!activeError && styles.labelError,
              labelStyle,
            ]}
          >
            {localizedLabel}
          </Text>
        ) : null}

        <View
          style={[
            styles.inputBox,
            { backgroundColor: themeColors.card, borderColor: themeColors.border },
            floatingLabel && styles.inputBoxFloating,
            isFocused && [
              styles.inputBoxFocused,
              {
                borderColor: themeColors.primary,
                backgroundColor: isDark ? themeColors.surface : "#FFFFFF",
              },
            ],
            !!activeError && [
              styles.inputBoxError,
              {
                borderColor: themeColors.danger,
                backgroundColor: themeColors.dangerLight,
              },
            ],
            disabled && styles.inputBoxDisabled,
          ]}
        >
          {leftIcon ? <View style={styles.leftIconContainer}>{leftIcon}</View> : null}

          <View style={styles.inputInnerContainer}>
            {effectiveLabel && floatingLabel ? (
              <Animated.Text
                numberOfLines={1}
                className={labelClassName}
                style={[
                  styles.floatingLabel,
                  animatedLabelStyle,
                  !!activeError && styles.labelError,
                  labelStyle,
                ]}
              >
                {effectiveLabel}
              </Animated.Text>
            ) : null}

            <TextInput
              ref={ref}
              value={currentValue}
              onChangeText={handleTextChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={floatingLabel && !isFocused ? undefined : localizedPlaceholder}
              placeholderTextColor={themeColors.textMuted}
              editable={!disabled}
              secureTextEntry={isPassword ? !secureVisible : secureTextEntry}
              autoComplete={autofillProps.autoComplete}
              textContentType={autofillProps.textContentType}
              className={inputClassName}
              accessible={true}
              accessibilityLabel={rest.accessibilityLabel || effectiveLabel || placeholder}
              accessibilityHint={
                rest.accessibilityHint ||
                (effectiveLabel ? `Enter ${effectiveLabel}` : activeError ? `Error: ${activeError}` : helperText)
              }
              accessibilityState={{ disabled }}
              {...({ accessibilityInvalid: !!activeError } as any)}
              allowFontScaling={true}
              maxFontSizeMultiplier={1.4}
              {...(Platform.OS === "web" && {
                "aria-label": rest.accessibilityLabel || effectiveLabel || placeholder,
                "aria-invalid": !!activeError,
                "aria-errormessage": activeError ? `${label || "input"}-error` : undefined,
              })}
              style={[
                styles.textInput,
                { color: themeColors.text, fontFamily: FONTS.bengali.regular },
                floatingLabel && hasValue && styles.textInputWithFloating,
                inputStyle,
              ]}
              {...rest}
            />
          </View>

          {isPassword ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={secureVisible ? "Hide password" : "Show password"}
              hitSlop={hitSlopPresets.md}
              onPress={togglePasswordVisibility}
              style={styles.rightActionContainer}
            >
              <Ionicons
                accessible={false}
                importantForAccessibility="no"
                name={secureVisible ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.neutral[500]}
              />
            </Pressable>
          ) : rightIcon ? (
            <View accessible={false} importantForAccessibility="no" style={styles.rightActionContainer}>
              {rightIcon}
            </View>
          ) : null}
        </View>

        {showStrengthMeter && (isPassword || secureTextEntry) && (
          <PasswordStrengthMeter password={currentValue} showCriteria={isFocused} />
        )}

        {activeError ? (
          <View
            style={styles.errorRow}
            accessibilityLiveRegion="polite"
            {...(Platform.OS === "web" && {
              id: `${label || "input"}-error`,
              "aria-live": "polite",
            })}
          >
            <Ionicons
              accessible={false}
              importantForAccessibility="no"
              name="alert-circle"
              size={14}
              color={colors.status.danger.main}
              style={styles.errorIcon}
            />
            <Text
              accessibilityRole="alert"
              allowFontScaling={true}
              maxFontSizeMultiplier={1.3}
              style={[styles.errorText, errorStyle]}
            >
              {activeError}
            </Text>
          </View>
        ) : helperText ? (
          <Text
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
            style={styles.helperText}
          >
            {helperText}
          </Text>
        ) : null}
      </View>
    );
  }
);

Input.displayName = "Input";

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 6,
    width: "100%",
  },
  staticLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface.card,
    borderWidth: 1.2,
    borderColor: colors.border.default,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 52,
  },
  inputBoxFloating: {
    minHeight: 56,
  },
  inputBoxFocused: {
    borderColor: colors.brand.trip.blue,
    backgroundColor: colors.neutral[0],
  },
  inputBoxError: {
    borderColor: colors.status.danger.main,
    backgroundColor: colors.status.danger.light,
  },
  inputBoxDisabled: {
    backgroundColor: colors.neutral[100],
    borderColor: colors.border.subtle,
    opacity: 0.6,
  },
  inputInnerContainer: {
    flex: 1,
    justifyContent: "center",
    position: "relative",
  },
  floatingLabel: {
    position: "absolute",
    left: 0,
    fontWeight: "500",
  },
  textInput: {
    fontSize: 15,
    color: colors.text.primary,
    paddingVertical: 10,
    paddingHorizontal: 0,
    height: "100%",
  },
  textInputWithFloating: {
    paddingTop: 18,
    paddingBottom: 4,
  },
  leftIconContainer: {
    marginEnd: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  rightActionContainer: {
    marginStart: 10,
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
  },
  labelError: {
    color: colors.status.danger.dark,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    paddingHorizontal: 4,
  },
  errorIcon: {
    marginEnd: 5,
  },
  errorText: {
    fontSize: 12,
    color: colors.status.danger.dark,
    fontWeight: "500",
  },
  helperText: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 4,
    paddingHorizontal: 4,
  },
});
