import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { Button } from "./ui/Button";

export type AuthSubmitButtonProps = {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Unified AuthSubmitButton
 * Standardized across auth screens to use canonical Button implementation.
 */
export function AuthSubmitButton({
  label,
  loading = false,
  disabled = false,
  onPress,
  style,
  testID,
}: AuthSubmitButtonProps) {
  return (
    <Button
      label={label}
      loading={loading}
      disabled={disabled}
      onPress={onPress}
      variant="primary"
      size="lg"
      fullWidth
      style={style}
      testID={testID}
      accessibilityLabel={label}
    />
  );
}

export default AuthSubmitButton;
