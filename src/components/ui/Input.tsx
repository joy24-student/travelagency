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
import { colors } from "../../theme/colors";

export interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  floatingLabel?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
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
    const [isFocused, setIsFocused] = useState(false);
    const [secureVisible, setSecureVisible] = useState(false);
    const [internalError, setInternalError] = useState<string | null>(null);
    const [currentValue, setCurrentValue] = useState(value || defaultValue || "");

    const activeError = externalError !== undefined ? externalError : internalError;
    const hasValue = currentValue.length > 0;
    const isFloating = floatingLabel && (isFocused || hasValue);

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
      setCurrentValue(text);
      if (internalError) {
        setInternalError(null);
      }
      onChangeText?.(text);
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
        } catch {}
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
        {label && !floatingLabel ? (
          <Text
            className={labelClassName}
            style={[styles.staticLabel, !!activeError && styles.labelError, labelStyle]}
          >
            {label}
          </Text>
        ) : null}

        <View
          style={[
            styles.inputBox,
            floatingLabel && styles.inputBoxFloating,
            isFocused && styles.inputBoxFocused,
            !!activeError && styles.inputBoxError,
            disabled && styles.inputBoxDisabled,
          ]}
        >
          {leftIcon ? <View style={styles.leftIconContainer}>{leftIcon}</View> : null}

          <View style={styles.inputInnerContainer}>
            {label && floatingLabel ? (
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
                {label}
              </Animated.Text>
            ) : null}

            <TextInput
              ref={ref}
              value={currentValue}
              onChangeText={handleTextChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={floatingLabel && !isFocused ? undefined : placeholder}
              placeholderTextColor={colors.text.muted}
              editable={!disabled}
              secureTextEntry={isPassword ? !secureVisible : secureTextEntry}
              className={inputClassName}
              style={[
                styles.textInput,
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
              onPress={togglePasswordVisibility}
              style={styles.rightActionContainer}
            >
              <Ionicons
                name={secureVisible ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.neutral[500]}
              />
            </Pressable>
          ) : rightIcon ? (
            <View style={styles.rightActionContainer}>{rightIcon}</View>
          ) : null}
        </View>

        {activeError ? (
          <View style={styles.errorRow}>
            <Ionicons
              name="alert-circle"
              size={14}
              color={colors.status.danger.main}
              style={styles.errorIcon}
            />
            <Text style={[styles.errorText, errorStyle]}>{activeError}</Text>
          </View>
        ) : helperText ? (
          <Text style={styles.helperText}>{helperText}</Text>
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
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  rightActionContainer: {
    marginLeft: 10,
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
    marginRight: 5,
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
