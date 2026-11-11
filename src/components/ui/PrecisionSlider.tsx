import React, { useState, useEffect, useCallback } from "react";
import { Platform,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
  LayoutChangeEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatLocalizedNumber, toLatinDigits } from "../../utils/formatters";
import { getActiveCurrency, CURRENCY_METADATA } from "../../utils/currency";

export interface PrecisionSliderProps {
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  prefix?: string;
  presets?: number[];
  onChange: (val: number) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const PrecisionSlider: React.FC<PrecisionSliderProps> = ({
  label,
  value,
  min,
  max,
  step = 500,
  unit,
  prefix,
  presets,
  onChange,
  style,
  testID,
}) => {
  const [inputText, setInputText] = useState(String(value));
  const [trackWidth, setTrackWidth] = useState(250);

  // Active currency symbol as fallback prefix
  const activeCurrency = getActiveCurrency();
  const effectivePrefix = prefix !== undefined ? prefix : (unit ? "" : (CURRENCY_METADATA[activeCurrency]?.symbol || "৳"));

  // Keep input text in sync when external value changes
  useEffect(() => {
    setInputText(formatLocalizedNumber(value));
  }, [value]);

  const clamp = useCallback(
    (val: number) => {
      const clamped = Math.max(min, Math.min(max, val));
      return Math.round(clamped / step) * step;
    },
    [min, max, step]
  );

  const handleTextCommit = () => {
    const rawNumber = parseFloat(toLatinDigits(inputText).replace(/[^0-9.]/g, ""));
    if (isNaN(rawNumber)) {
      setInputText(formatLocalizedNumber(value));
      return;
    }
    const clamped = Math.max(min, Math.min(max, rawNumber));
    onChange(clamped);
    setInputText(formatLocalizedNumber(clamped));
  };

  const handleStepDelta = (delta: number) => {
    const nextVal = clamp(value + delta);
    onChange(nextVal);
  };

  const handleTrackTouch = (event: GestureResponderEvent) => {
    if (trackWidth <= 0) return;
    const touchX = event.nativeEvent.locationX;
    const ratio = Math.max(0, Math.min(1, touchX / trackWidth));
    const rawVal = min + ratio * (max - min);
    onChange(clamp(rawVal));
  };

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setTrackWidth(w);
  };

  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min || 1)) * 100));

  return (
    <View style={[styles.container, style]} testID={testID}>
      {/* Header: Label & Precision Numeric TextInput */}
      <View style={styles.headerRow}>
        {label ? <Text style={styles.label}>{label}</Text> : <View />}

        <View style={styles.inputContainer}>
          {effectivePrefix ? (
            <Text style={styles.prefixText}>{effectivePrefix}</Text>
          ) : null}
          <TextInput
            style={styles.numericInput}
            keyboardType="number-pad"
            value={inputText}
            onChangeText={(txt) => setInputText(txt)}
            onBlur={handleTextCommit}
            onSubmitEditing={handleTextCommit}
            selectTextOnFocus
            accessibilityLabel={`${label || "Value"} numeric input`}
          />
          {unit ? <Text style={styles.unitText}>{unit}</Text> : null}
        </View>
      </View>

      {/* Visual Slider Bar Track with Fine Stepper Buttons */}
      <View style={styles.sliderControlRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Decrease value"
          style={styles.stepBtn}
          onPress={() => handleStepDelta(-step)}
          disabled={value <= min}
        >
          <Ionicons
            name="remove"
            size={18}
            color={value <= min ? "#94a3b8" : "#2563eb"}
          />
        </Pressable>

        {/* Interactive Track Area */}
        <Pressable
          style={styles.trackContainer}
          onLayout={handleLayout}
          onPress={handleTrackTouch}
          accessibilityRole="adjustable"
          accessibilityLabel={label || "Slider"}
          accessibilityValue={{ min, max, now: value }}
        >
          <View style={styles.trackBg}>
            <View style={[styles.trackFill, { width: `${percentage}%` }]} />
            <View
              style={[
                styles.thumb,
                { left: `${Math.max(0, Math.min(95, percentage))}%` },
              ]}
            />
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Increase value"
          style={styles.stepBtn}
          onPress={() => handleStepDelta(step)}
          disabled={value >= max}
        >
          <Ionicons
            name="add"
            size={18}
            color={value >= max ? "#94a3b8" : "#2563eb"}
          />
        </Pressable>
      </View>

      {/* Range Min/Max Labels */}
      <View style={styles.rangeRow}>
        <Text style={styles.rangeText}>
          {effectivePrefix} {formatLocalizedNumber(min)} {unit || ""}
        </Text>
        <Text style={styles.rangeText}>
          {effectivePrefix} {formatLocalizedNumber(max)}+ {unit || ""}
        </Text>
      </View>

      {/* Quick Select Presets */}
      {presets && presets.length > 0 ? (
        <View style={styles.presetsRow}>
          {presets.map((preset) => {
            const isSelected = value === preset;
            return (
              <Pressable
                key={`preset-${preset}`}
                onPress={() => onChange(preset)}
                style={[
                  styles.presetChip,
                  isSelected && styles.presetChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.presetText,
                    isSelected && styles.presetTextActive,
                  ]}
                >
                  {effectivePrefix} {formatLocalizedNumber(preset)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 105,
    justifyContent: "flex-end",
  },
  prefixText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2563eb",
    marginEnd: 4,
  },
  unitText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginStart: 4,
  },
  numericInput: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
    padding: 0,
    textAlign: "right",
    minWidth: 55,
  },
  sliderControlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 4,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  trackContainer: {
    flex: 1,
    height: 32,
    justifyContent: "center",
  },
  trackBg: {
    height: 8,
    backgroundColor: "#e2e8f0",
    borderRadius: 999,
    position: "relative",
  },
  trackFill: {
    height: "100%",
    backgroundColor: "#2563eb",
    borderRadius: 999,
  },
  thumb: {
    position: "absolute",
    top: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 3,
    borderColor: "#2563eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
    ...(Platform.OS === "web" ? { boxShadow: "0px 1px 2px rgba(15, 23, 42, 0.25)" } : {}),
  },
  rangeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  rangeText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  presetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  presetChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  presetChipActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  presetText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  presetTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
});

export default PrecisionSlider;
