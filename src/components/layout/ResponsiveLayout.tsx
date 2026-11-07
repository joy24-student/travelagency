import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle, ScrollView, ScrollViewProps, DimensionValue } from "react-native";
import { useResponsive, Breakpoint } from "../../hooks/useResponsive";

// ============================================================================
// 1. ResponsiveContainer: Centers & constraints content on tablet/web
// ============================================================================

export interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: number;
  paddingHorizontal?: number;
  style?: StyleProp<ViewStyle>;
  scrollable?: boolean;
  scrollViewProps?: ScrollViewProps;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  maxWidth = 1240,
  paddingHorizontal,
  style,
  scrollable = false,
  scrollViewProps,
}) => {
  const { isDesktop, isTablet, width } = useResponsive();

  const effectivePadding =
    paddingHorizontal !== undefined
      ? paddingHorizontal
      : isDesktop
        ? 32
        : isTablet
          ? 24
          : 16;

  const containerStyle: ViewStyle = {
    width: "100%",
    maxWidth: isDesktop || isTablet ? maxWidth : undefined,
    alignSelf: "center",
    paddingHorizontal: effectivePadding,
  };

  if (scrollable) {
    return (
      <ScrollView
        contentContainerStyle={[styles.scrollGrow, containerStyle, style]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        {...scrollViewProps}
      >
        {children}
      </ScrollView>
    );
  }

  return <View style={[containerStyle, style]}>{children}</View>;
};

// ============================================================================
// 2. ResponsiveGrid: Multi-column grid layout for lists/cards
// ============================================================================

export interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
  style?: StyleProp<ViewStyle>;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns,
  gap = 16,
  style,
}) => {
  const { breakpoint, isLandscape } = useResponsive();

  // Determine active columns
  let activeCols = 1;
  if (columns) {
    if (breakpoint === "2xl" || breakpoint === "xl") activeCols = columns.xl ?? columns.lg ?? columns.md ?? 4;
    else if (breakpoint === "lg") activeCols = columns.lg ?? columns.md ?? 3;
    else if (breakpoint === "md") activeCols = columns.md ?? 2;
    else if (breakpoint === "sm") activeCols = columns.sm ?? (isLandscape ? 2 : 1);
    else activeCols = columns.xs ?? 1;
  } else {
    // Default sensible responsive columns
    if (breakpoint === "2xl" || breakpoint === "xl") activeCols = 4;
    else if (breakpoint === "lg") activeCols = 3;
    else if (breakpoint === "md") activeCols = 2;
    else if (breakpoint === "sm" && isLandscape) activeCols = 2;
    else activeCols = 1;
  }

  const childArray = React.Children.toArray(children);
  const columnWidthPercent = `${(100 / activeCols) - (gap * (activeCols - 1)) / (activeCols * 10)}%`;

  return (
    <View style={[styles.gridContainer, { gap }, style]}>
      {childArray.map((child, index) => (
        <View
          key={index}
          style={[
            styles.gridItem,
            activeCols > 1 && {
              flexBasis: activeCols === 2 ? "48%" : activeCols === 3 ? "31.5%" : "23.5%",
              maxWidth: activeCols === 2 ? "50%" : activeCols === 3 ? "33.3%" : "25%",
            },
          ]}
        >
          {child}
        </View>
      ))}
    </View>
  );
};

// ============================================================================
// 3. ResponsiveRow & ResponsiveCol: Flex-based grid
// ============================================================================

export interface ResponsiveRowProps {
  children: React.ReactNode;
  gap?: number;
  wrap?: boolean;
  style?: StyleProp<ViewStyle>;
  alignItems?: ViewStyle["alignItems"];
  justifyContent?: ViewStyle["justifyContent"];
}

export const ResponsiveRow: React.FC<ResponsiveRowProps> = ({
  children,
  gap = 16,
  wrap = true,
  style,
  alignItems = "stretch",
  justifyContent = "flex-start",
}) => {
  const { isPhone } = useResponsive();

  return (
    <View
      style={[
        styles.row,
        {
          flexDirection: isPhone ? "column" : "row",
          flexWrap: wrap && !isPhone ? "wrap" : "nowrap",
          gap,
          alignItems,
          justifyContent,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

export interface ResponsiveColProps {
  children: React.ReactNode;
  // Span out of 12 columns on desktop/tablet
  span?: number;
  phoneSpan?: number;
  tabletSpan?: number;
  desktopSpan?: number;
  style?: StyleProp<ViewStyle>;
}

export const ResponsiveCol: React.FC<ResponsiveColProps> = ({
  children,
  span = 12,
  phoneSpan = 12,
  tabletSpan,
  desktopSpan,
  style,
}) => {
  const { isDesktop, isTablet, isPhone } = useResponsive();

  let effectiveSpan = span;
  if (isDesktop && desktopSpan !== undefined) effectiveSpan = desktopSpan;
  else if (isTablet && tabletSpan !== undefined) effectiveSpan = tabletSpan;
  else if (isPhone) effectiveSpan = phoneSpan;

  const widthPercent = `${(effectiveSpan / 12) * 100}%` as DimensionValue;

  return (
    <View
      style={[
        {
          width: widthPercent,
          flexShrink: 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

// ============================================================================
// 4. ResponsiveSplitView: Master-Detail layout for Tablet & Desktop
// ============================================================================

export interface ResponsiveSplitViewProps {
  sidebar: React.ReactNode;
  content: React.ReactNode;
  sidebarWidth?: number;
  breakpointCollapse?: "sm" | "md" | "lg";
  style?: StyleProp<ViewStyle>;
}

export const ResponsiveSplitView: React.FC<ResponsiveSplitViewProps> = ({
  sidebar,
  content,
  sidebarWidth = 320,
  breakpointCollapse = "md",
  style,
}) => {
  const { breakpoint, isPhone } = useResponsive();

  const isCollapsed =
    isPhone ||
    (breakpointCollapse === "lg" && ["xs", "sm", "md"].includes(breakpoint)) ||
    (breakpointCollapse === "md" && ["xs", "sm"].includes(breakpoint));

  if (isCollapsed) {
    return (
      <View style={[styles.flexOne, style]}>
        <View style={styles.collapsedSidebar}>{sidebar}</View>
        <View style={styles.flexOne}>{content}</View>
      </View>
    );
  }

  return (
    <View style={[styles.splitRow, style]}>
      <View style={[styles.sidebarPane, { width: sidebarWidth }]}>{sidebar}</View>
      <View style={styles.contentPane}>{content}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  scrollGrow: {
    flexGrow: 1,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
  },
  gridItem: {
    flexGrow: 1,
    flexShrink: 0,
    width: "100%",
  },
  row: {
    width: "100%",
  },
  splitRow: {
    flex: 1,
    flexDirection: "row",
    width: "100%",
  },
  sidebarPane: {
    flexShrink: 0,
    borderRightWidth: 1,
    borderRightColor: "#E2E8F0",
  },
  contentPane: {
    flex: 1,
  },
  collapsedSidebar: {
    width: "100%",
    marginBottom: 16,
  },
});
