import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  LayoutChangeEvent,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../theme";
import { formatLocalizedCurrency } from "../../utils/formatters";

export interface PriceHistogramSliderProps {
  min: number;
  max: number;
  selectedMin: number;
  selectedMax: number;
  dataPoints?: number[]; // Frequencies or distribution weights for bars (e.g. 24 bars)
  step?: number;
  currency?: string;
  onChange: (min: number, max: number) => void;
  title?: string;
}

export const PriceHistogramSlider: React.FC<PriceHistogramSliderProps> = ({
  min = 500,
  max = 25000,
  selectedMin,
  selectedMax,
  dataPoints,
  step = 250,
  currency = "BDT",
  onChange,
  title = "Price Range",
}) => {
  const { colors, isDark } = useTheme();
  const [trackWidth, setTrackWidth] = useState(300);

  // Default natural Bell-curve / realistic distribution for hotel listings if none passed
  const bars = useMemo(() => {
    if (dataPoints && dataPoints.length > 0) return dataPoints;
    return [
      12, 18, 25, 42, 60, 85, 110, 145, 190, 175, 160, 130, 105, 80, 65, 45, 30, 22, 15, 10,
    ];
  }, [dataPoints]);

  const maxBarValue = useMemo(() => Math.max(...bars, 1), [bars]);

  // Convert price to X coordinate on track
  const priceToX = useCallback(
    (price: number) => {
      const clamped = Math.max(min, Math.min(max, price));
      const ratio = (clamped - min) / (max - min || 1);
      return ratio * trackWidth;
    },
    [min, max, trackWidth]
  );

  // Convert X coordinate to price
  const xToPrice = useCallback(
    (x: number) => {
      const ratio = Math.max(0, Math.min(1, x / (trackWidth || 1)));
      const raw = min + ratio * (max - min);
      const stepped = Math.round(raw / step) * step;
      return Math.max(min, Math.min(max, stepped));
    },
    [min, max, step, trackWidth]
  );

  // Min Thumb PanResponder
  const minPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gestureState) => {
          const currentX = priceToX(selectedMin);
          const newX = currentX + gestureState.dx;
          const newMin = Math.min(selectedMax - step, xToPrice(newX));
          if (newMin !== selectedMin) {
            if (Platform.OS !== "web") {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
            }
            onChange(newMin, selectedMax);
          }
        },
      }),
    [onChange, priceToX, selectedMax, selectedMin, step, xToPrice]
  );

  // Max Thumb PanResponder
  const maxPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gestureState) => {
          const currentX = priceToX(selectedMax);
          const newX = currentX + gestureState.dx;
          const newMax = Math.max(selectedMin + step, xToPrice(newX));
          if (newMax !== selectedMax) {
            if (Platform.OS !== "web") {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
            }
            onChange(selectedMin, newMax);
          }
        },
      }),
    [onChange, priceToX, selectedMax, selectedMin, step, xToPrice]
  );

  const onLayoutTrack = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - trackWidth) > 2) {
      setTrackWidth(w);
    }
  };

  const minX = priceToX(selectedMin);
  const maxX = priceToX(selectedMax);

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.rangeText, { color: colors.primary }]}>
          {formatLocalizedCurrency(selectedMin, currency)} -{" "}
          {formatLocalizedCurrency(selectedMax, currency)}
        </Text>
      </View>

      {/* Histogram Bar Chart */}
      <View style={styles.chartContainer} onLayout={onLayoutTrack}>
        <View style={styles.barsRow}>
          {bars.map((val, idx) => {
            const barFraction = idx / (bars.length - 1 || 1);
            const barPrice = min + barFraction * (max - min);
            const isSelected = barPrice >= selectedMin && barPrice <= selectedMax;

            // Height scaled to maxBarValue (max height 52px)
            const height = Math.max(6, (val / maxBarValue) * 52);

            return (
              <View
                key={`bar-${idx}`}
                style={[
                  styles.bar,
                  {
                    height,
                    backgroundColor: isSelected
                      ? colors.primary
                      : isDark
                      ? "#334155"
                      : "#E2E8F0",
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Base Track */}
        <View
          style={[
            styles.baseTrack,
            { backgroundColor: isDark ? "#334155" : "#E2E8F0" },
          ]}
        >
          {/* Active Colored Segment */}
          <View
            style={[
              styles.activeSegment,
              {
                left: minX,
                width: Math.max(0, maxX - minX),
                backgroundColor: colors.primary,
              },
            ]}
          />
        </View>

        {/* Left / Min Thumb */}
        <View
          {...minPanResponder.panHandlers}
          style={[
            styles.thumb,
            {
              left: Math.max(0, minX - 14),
              backgroundColor: "#FFFFFF",
              borderColor: colors.primary,
            },
          ]}
        >
          <View style={[styles.innerThumb, { backgroundColor: colors.primary }]} />
        </View>

        {/* Right / Max Thumb */}
        <View
          {...maxPanResponder.panHandlers}
          style={[
            styles.thumb,
            {
              left: Math.min(trackWidth - 28, maxX - 14),
              backgroundColor: "#FFFFFF",
              borderColor: colors.primary,
            },
          ]}
        >
          <View style={[styles.innerThumb, { backgroundColor: colors.primary }]} />
        </View>
      </View>

      {/* Min - Max Footnote */}
      <View style={styles.footerRow}>
        <Text style={[styles.limitLabel, { color: colors.textSecondary }]}>
          Min: {formatLocalizedCurrency(min, currency)}
        </Text>
        <Text style={[styles.limitLabel, { color: colors.textSecondary }]}>
          Max: {formatLocalizedCurrency(max, currency)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    width: "100%",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
  },
  rangeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  chartContainer: {
    height: 72,
    justifyContent: "flex-end",
    position: "relative",
    marginHorizontal: 10,
    marginBottom: 6,
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 52,
    width: "100%",
    paddingBottom: 4,
  },
  bar: {
    flex: 1,
    marginHorizontal: 1.5,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  baseTrack: {
    height: 4,
    width: "100%",
    borderRadius: 2,
    position: "relative",
  },
  activeSegment: {
    position: "absolute",
    height: 4,
    borderRadius: 2,
  },
  thumb: {
    position: "absolute",
    bottom: -12,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 3,
    zIndex: 10,
  },
  innerThumb: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingHorizontal: 4,
  },
  limitLabel: {
    fontSize: 12,
  },
});

export default PriceHistogramSlider;
