import React, { useState } from "react";
import { Controller, Control, FieldValues, Path } from "react-hook-form";
import {
  Text,
  TextInput,
  TextInputProps,
  View,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { getLocalizedValidationError, getLocalizedPlaceholder } from "../utils/validation";
import { PasswordStrengthMeter } from "./ui/PasswordStrengthMeter";
import { maskBangladeshiPhone, maskCurrencyInput } from "../utils/masking";
import i18n from "../locales/i18n";

type AuthTextFieldProps<T extends FieldValues> = TextInputProps & {
  control: Control<T>;
  name: Path<T>;
  label: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showStrengthMeter?: boolean;
  isNewPassword?: boolean;
  inputRef?: React.Ref<TextInput>;
  mask?: "phone" | "currency" | "number" | "none";
};

export function AuthTextField<T extends FieldValues>({
  control,
  name,
  label,
  leftIcon,
  rightIcon,
  showStrengthMeter = false,
  isNewPassword = false,
  inputRef,
  secureTextEntry,
  mask,
  ...inputProps
}: AuthTextFieldProps<T>) {
  const [showSecure, setShowSecure] = useState(false);
  const localizedLabel = i18n.t(label, { defaultValue: label });
  const localizedPlaceholder = getLocalizedPlaceholder(inputProps.placeholder);

  const isPassword = Boolean(
    secureTextEntry ||
      String(name).toLowerCase().includes("password") ||
      label.toLowerCase().includes("password")
  );

  const toggleSecure = async () => {
    if (Platform.OS !== "web") {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    setShowSecure((prev) => !prev);
  };

  // Determine autofill
  const nameStr = String(name).toLowerCase();
  const labelStr = label.toLowerCase();
  let defaultAutoComplete = inputProps.autoComplete;
  let defaultTextContentType = inputProps.textContentType;

  if (!defaultAutoComplete || !defaultTextContentType) {
    if (isPassword) {
      const isNew = isNewPassword || nameStr.includes("new") || nameStr.includes("confirm") || labelStr.includes("confirm");
      defaultAutoComplete = defaultAutoComplete || (isNew ? "new-password" : "current-password");
      defaultTextContentType = defaultTextContentType || (isNew ? "newPassword" : "password");
    } else if (nameStr.includes("email") || labelStr.includes("email")) {
      defaultAutoComplete = defaultAutoComplete || "email";
      defaultTextContentType = defaultTextContentType || "emailAddress";
    } else if (nameStr.includes("token") || nameStr.includes("otp") || labelStr.includes("code")) {
      defaultAutoComplete = defaultAutoComplete || "one-time-code";
      defaultTextContentType = defaultTextContentType || "oneTimeCode";
    } else if (nameStr.includes("phone") || labelStr.includes("phone")) {
      defaultAutoComplete = defaultAutoComplete || "tel";
      defaultTextContentType = defaultTextContentType || "telephoneNumber";
    } else if (nameStr.includes("name") || labelStr.includes("name")) {
      defaultAutoComplete = defaultAutoComplete || "name";
      defaultTextContentType = defaultTextContentType || "name";
    }
  }

  return (
    <Controller
      control={control}
      name={name}
      render={({
        field: { onBlur, onChange, value },
        fieldState: { error },
      }) => (
        <View className="mb-4">
          <Text className="mb-2 text-sm font-bold text-gray-700">{localizedLabel}</Text>
          <View style={styles.inputWrapper}>
            {leftIcon && (
              <View style={styles.leftIcon}>
                {leftIcon}
              </View>
            )}
            <TextInput
              ref={inputRef}
              autoCapitalize="none"
              className={`rounded-xl border bg-white py-3 text-base text-gray-900 ${
                error ? "border-red-400" : "border-gray-200"
              }`}
              style={{
                paddingStart: leftIcon ? 44 : 16,
                paddingEnd: isPassword || rightIcon ? 44 : 16,
                width: "100%",
              }}
              onBlur={onBlur}
              onChangeText={(text) => {
                let formatted = text;
                const isPhone = mask === "phone" || (!mask && (inputProps.keyboardType === "phone-pad" || nameStr.includes("phone") || labelStr.includes("phone") || labelStr.includes("mobile")));
                const isCurr = mask === "currency" || mask === "number" || (!mask && (nameStr.includes("amount") || nameStr.includes("price") || labelStr.includes("price")));
                if (isPhone) {
                  formatted = maskBangladeshiPhone(text);
                } else if (isCurr) {
                  formatted = maskCurrencyInput(text);
                }
                onChange(formatted);
              }}
              placeholder={localizedPlaceholder}
              placeholderTextColor="#9ca3af"
              value={(value ?? "") as string}
              secureTextEntry={isPassword ? !showSecure : false}
              autoComplete={defaultAutoComplete}
              textContentType={defaultTextContentType}
              accessible={true}
              accessibilityLabel={inputProps.accessibilityLabel || localizedLabel || inputProps.placeholder}
              accessibilityHint={inputProps.accessibilityHint || `Enter ${localizedLabel.toLowerCase()}`}
              aria-invalid={!!error}
              accessibilityState={{ disabled: inputProps.editable === false }}
              {...inputProps}
            />
            {isPassword ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showSecure ? "Hide password" : "Show password"}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={toggleSecure}
                style={styles.rightIcon}
              >
                <Ionicons
                  name={showSecure ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#9ca3af"
                />
              </Pressable>
            ) : rightIcon ? (
              <View style={styles.rightIcon}>
                {rightIcon}
              </View>
            ) : null}
          </View>
          {showStrengthMeter && isPassword && (
            <PasswordStrengthMeter password={(value ?? "") as string} />
          )}
          {error?.message ? (
            <Text className="mt-1 text-xs font-semibold text-red-500">
              {getLocalizedValidationError(error.message)}
            </Text>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  inputWrapper: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
  },
  leftIcon: {
    position: "absolute",
    left: 12,
    zIndex: 10,
  },
  rightIcon: {
    position: "absolute",
    right: 12,
    zIndex: 10,
  },
});
