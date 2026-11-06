import React, { useState } from "react";
import {
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
  LayoutChangeEvent,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  WithTimingConfig,
  WithSpringConfig,
  runOnJS,
} from "react-native-reanimated";
import { timingPresets, springPresets } from "./animations";

export interface AnimatedHeightProps {
  children: React.ReactNode;
  expanded: boolean;
  initialHeight?: number;
  animationType?: "timing" | "spring";
  timingConfig?: WithTimingConfig;
  springConfig?: WithSpringConfig;
  onTransitionEnd?: (isExpanded: boolean) => void;
  className?: string;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * AnimatedHeight - Shopno Jatra Native Animation Primitive
 * Replaces legacy React Native `Animated` height properties with UI-thread driven
 * reanimated (v4) worklets, eliminating JS thread layout bottlenecks and warnings.
 */
export const AnimatedHeight: React.FC<AnimatedHeightProps> = ({
  children,
  expanded,
  initialHeight = 0,
  animationType = "timing",
  timingConfig = timingPresets.normal,
  springConfig = springPresets.gentle,
  onTransitionEnd,
  className,
  style,
  contentStyle,
  testID,
}) => {
  const [measuredHeight, setMeasuredHeight] = useState<number>(0);
  const animatedHeight = useSharedValue<number>(expanded ? measuredHeight || initialHeight : initialHeight);

  const handleLayout = (event: LayoutChangeEvent) => {
    const layoutHeight = event.nativeEvent.layout.height;
    if (layoutHeight > 0 && Math.abs(layoutHeight - measuredHeight) > 1) {
      setMeasuredHeight(layoutHeight);
      updateHeight(expanded, layoutHeight);
    }
  };

  const updateHeight = (isExpanded: boolean, targetHeight: number) => {
    const toValue = isExpanded ? targetHeight : initialHeight;

    const handleEnd = (finished?: boolean) => {
      "worklet";
      if (finished && onTransitionEnd) {
        runOnJS(onTransitionEnd)(isExpanded);
      }
    };

    if (animationType === "spring") {
      animatedHeight.value = withSpring(toValue, springConfig, handleEnd);
    } else {
      animatedHeight.value = withTiming(toValue, timingConfig, handleEnd);
    }
  };

  React.useEffect(() => {
    if (measuredHeight > 0) {
      updateHeight(expanded, measuredHeight);
    }
  }, [expanded]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      height: animatedHeight.value,
      overflow: "hidden" as const,
    };
  });

  return (
    <Animated.View
      testID={testID}
      className={className}
      style={[animatedStyle, style]}
    >
      <View
        onLayout={handleLayout}
        style={[styles.contentContainer, contentStyle]}
      >
        {children}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
});
