/**
 * AsyncStateView Component
 *
 * Enforces rigorous separation between 3 distinct asynchronous states:
 * 1. Loading: Displays shimmer skeleton loader or spinner.
 * 2. Empty: Displays EmptyStateView when query succeeded but returned 0 items.
 * 3. Error: Displays ErrorStateCard with actionable "আবার চেষ্টা করুন" (Retry) button.
 */

import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle, ActivityIndicator } from "react-native";
import { ListSkeleton } from "./SkeletonLoader";
import { ErrorStateCard } from "./ErrorStateCard";
import { EmptyStateView } from "./EmptyStateView";
import { isSlowNetworkError } from "../../utils/networkTimeout";

export interface AsyncStateViewProps<T> {
  loading: boolean;
  error?: Error | string | null;
  data?: T | null;
  isEmpty?: (data: T | null | undefined) => boolean;
  onRetry?: () => void;
  retryText?: string;
  errorTitle?: string;
  errorMessage?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
  skeletonCount?: number;
  skeletonType?: "generic" | "flight" | "card";
  customSkeleton?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode | ((data: T) => React.ReactNode);
}

export function AsyncStateView<T>({
  loading,
  error,
  data,
  isEmpty,
  onRetry,
  retryText = "আবার চেষ্টা করুন",
  errorTitle,
  errorMessage,
  emptyTitle = "কোনো তথ্য পাওয়া যায়নি",
  emptySubtitle = "আপনার অনুরোধ অনুযায়ী কোনো ফলাফল মেলেনি। ফিল্টার পরিবর্তন করে পুনরায় দেখুন।",
  skeletonCount = 4,
  skeletonType = "generic",
  customSkeleton,
  containerStyle,
  children,
}: AsyncStateViewProps<T>) {
  // 1. Error State (Prioritized if error occurred without cached data)
  if (error && (data === null || data === undefined)) {
    const isSlow = isSlowNetworkError(error);
    const resolvedTitle =
      errorTitle ||
      (isSlow ? "নেটওয়ার্ক খুব ধীরগতির" : "ডাটা লোড করা সম্ভব হয়নি");
    const resolvedMessage =
      errorMessage ||
      (typeof error === "string"
        ? error
        : error.message || "একটি অস্থায়ী নেটওয়ার্ক সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");

    return (
      <View style={[styles.container, containerStyle]}>
        <ErrorStateCard
          title={resolvedTitle}
          message={resolvedMessage}
          onRetry={onRetry}
          retryText={retryText}
        />
      </View>
    );
  }

  // 2. Loading State
  if (loading && (data === null || data === undefined)) {
    return (
      <View style={[styles.container, containerStyle]}>
        {customSkeleton || (
          <ListSkeleton count={skeletonCount} type={skeletonType} />
        )}
      </View>
    );
  }

  // 3. Determine if Empty
  const hasData = data !== null && data !== undefined;
  const isDataEmpty = isEmpty
    ? isEmpty(data)
    : Array.isArray(data)
    ? data.length === 0
    : !hasData;

  if (!loading && isDataEmpty) {
    return (
      <View style={[styles.container, containerStyle]}>
        <EmptyStateView
          title={emptyTitle}
          description={emptySubtitle}
          actionText={onRetry ? "রিফ্রেশ করুন" : undefined}
          onAction={onRetry}
        />
      </View>
    );
  }

  // 4. Success State
  return (
    <View style={[styles.fullFlex, containerStyle]}>
      {typeof children === "function" ? (children as any)(data) : children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    justifyContent: "center",
  },
  fullFlex: {
    flex: 1,
  },
});
