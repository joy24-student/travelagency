import React, { useState } from "react";
import {
  Image,
  ImageProps,
  ImageSourcePropType,
  View,
  StyleSheet,
  ActivityIndicator,
  Platform,
  StyleProp,
  ImageStyle,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";

export type ImagePlaceholderCategory =
  | "hotel"
  | "avatar"
  | "destination"
  | "flight"
  | "package"
  | "generic";

export interface AppImageProps extends Omit<ImageProps, "source"> {
  source?: ImageSourcePropType | { uri?: string | null };
  fallbackSource?: ImageSourcePropType;
  placeholderCategory?: ImagePlaceholderCategory;
  containerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ImageStyle>;
  showLoadingIndicator?: boolean;
}

const CATEGORY_ICONS: Record<ImagePlaceholderCategory, keyof typeof Ionicons.glyphMap> = {
  hotel: "bed-outline",
  avatar: "person-outline",
  destination: "earth-outline",
  flight: "airplane-outline",
  package: "briefcase-outline",
  generic: "image-outline",
};

/**
 * Resilient Smart Image Component
 * - Built-in placeholder & loading indicator preventing layout jump
 * - Automatic onError catch switching to branded semantic fallback icon / asset
 * - Prevents blank empty boxes or broken image icons when network drops or URLs expire
 */
export const AppImage: React.FC<AppImageProps> = ({
  source,
  fallbackSource,
  placeholderCategory = "generic",
  containerStyle,
  style,
  resizeMode = "cover",
  showLoadingIndicator = false,
  onError,
  onLoadEnd,
  ...rest
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { colors, isDark } = useTheme();

  const uri = typeof source === "object" && source !== null && "uri" in source ? source.uri : null;
  const isInvalidSource = !source || (uri !== null && (!uri || uri.trim() === ""));

  const handleError = (e: any) => {
    setHasError(true);
    setIsLoading(false);
    onError?.(e);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
    onLoadEnd?.();
  };

  // Flatten styles to extract dimensions & borderRadius
  const flattenedStyle = StyleSheet.flatten(style) || {};
  const { borderRadius, width, height, ...imageRestStyle } = flattenedStyle as any;

  if (hasError || isInvalidSource) {
    if (fallbackSource) {
      return (
        <Image
          source={fallbackSource}
          style={style}
          resizeMode={resizeMode}
          {...rest}
        />
      );
    }

    const fallbackBg = isDark ? "#1e293b" : "#f1f5f9";
    const iconColor = isDark ? "#64748b" : "#94a3b8";
    const iconSize = Math.min(36, Math.max(18, typeof height === "number" ? height * 0.3 : 24));

    return (
      <View
        style={[
          styles.fallbackContainer,
          {
            backgroundColor: fallbackBg,
            borderRadius: borderRadius || 0,
            width: width || "100%",
            height: height || "100%",
          },
          containerStyle,
          style as any,
        ]}
      >
        <Ionicons
          name={CATEGORY_ICONS[placeholderCategory]}
          size={iconSize}
          color={iconColor}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.outerContainer,
        {
          borderRadius: borderRadius || 0,
          width: width,
          height: height,
        },
        containerStyle,
      ]}
    >
      <Image
        source={source as ImageSourcePropType}
        style={[
          style,
          borderRadius ? { borderRadius } : undefined,
        ]}
        resizeMode={resizeMode}
        onError={handleError}
        onLoadEnd={handleLoadEnd}
        {...rest}
      />

      {isLoading && showLoadingIndicator && (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            styles.loadingOverlay,
            {
              backgroundColor: isDark ? "rgba(15, 23, 42, 0.4)" : "rgba(241, 245, 249, 0.6)",
              borderRadius: borderRadius || 0,
            },
          ]}
        >
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    overflow: "hidden",
    position: "relative",
  },
  loadingOverlay: {
    justifyContent: "center",
    alignItems: "center",
  },
  fallbackContainer: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0, 0, 0, 0.06)",
  },
});

export default AppImage;
