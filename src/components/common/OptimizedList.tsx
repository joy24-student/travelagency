import React, { useMemo } from "react";
import {
  FlatList,
  FlatListProps,
  Platform,
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from "react-native";
import { useResponsive } from "../../hooks/useResponsive";
import { EmptyStateView } from "./EmptyStateView";
import { ErrorStateCard } from "./ErrorStateCard";
import { ListSkeleton } from "./SkeletonLoader";
import { isSlowNetworkError } from "../../utils/networkTimeout";

export interface OptimizedListProps<T> extends Omit<FlatListProps<T>, "data"> {
  data: readonly T[] | null | undefined;
  loading?: boolean;
  error?: Error | string | null;
  onRetry?: () => void;
  retryText?: string;
  skeletonCount?: number;
  skeletonType?: "generic" | "flight" | "card";
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyIcon?: any;
  responsiveColumns?: boolean;
  minItemWidth?: number;
  containerStyle?: StyleProp<ViewStyle>;
  pageSize?: number;
  enablePagination?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

/**
 * High-performance virtualized list wrapper around React Native FlatList.
 * - Distinct handling for Loading, Error (with retry), and Empty states
 * - Enforces guaranteed unique keyExtractor (eliminating duplicate key warnings)
 * - Built-in virtualization tuning (windowSize, batching, removeClippedSubviews)
 * - Automatic responsive multi-column layout on tablet & web
 */
export function OptimizedList<T extends Record<string, any>>({
  data,
  renderItem,
  keyExtractor,
  loading = false,
  error,
  onRetry,
  retryText = "আবার চেষ্টা করুন",
  skeletonCount = 4,
  skeletonType = "generic",
  emptyTitle = "কিছু পাওয়া যায়নি",
  emptySubtitle = "কোনো ফলাফল পাওয়া যায়নি। পুনরায় চেষ্টা করুন বা ফিল্টার পরিবর্তন করুন।",
  emptyIcon,
  responsiveColumns = false,
  minItemWidth = 320,
  numColumns: customNumColumns,
  columnWrapperStyle,
  contentContainerStyle,
  removeClippedSubviews,
  initialNumToRender = 6,
  maxToRenderPerBatch = 8,
  windowSize = 5,
  updateCellsBatchingPeriod = 50,
  ListEmptyComponent,
  ListFooterComponent,
  containerStyle,
  pageSize,
  enablePagination,
  loadingMore: externalLoadingMore,
  hasMore: externalHasMore,
  onLoadMore,
  onEndReached,
  onEndReachedThreshold = 0.4,
  ...restProps
}: OptimizedListProps<T>) {
  const { width, isTablet, isDesktop } = useResponsive();
  const allItems = useMemo(() => (data ? Array.from(data) : []), [data]);

  // Client-side auto-pagination state
  const effectivePageSize = pageSize || (enablePagination ? 10 : undefined);
  const [internalPage, setInternalPage] = React.useState(1);
  const [internalLoadingMore, setInternalLoadingMore] = React.useState(false);

  React.useEffect(() => {
    setInternalPage(1);
  }, [allItems.length]);

  const pagedItems = useMemo(() => {
    if (!effectivePageSize) return allItems;
    return allItems.slice(0, internalPage * effectivePageSize);
  }, [allItems, effectivePageSize, internalPage]);

  const internalHasMore = effectivePageSize ? pagedItems.length < allItems.length : false;
  const isHasMore = externalHasMore !== undefined ? externalHasMore : internalHasMore;
  const isLoadingMore = externalLoadingMore !== undefined ? externalLoadingMore : internalLoadingMore;

  const handleEndReached = (info: { distanceFromEnd: number }) => {
    if (onLoadMore) {
      onLoadMore();
    } else if (effectivePageSize && internalHasMore && !internalLoadingMore) {
      setInternalLoadingMore(true);
      setTimeout(() => {
        setInternalPage((p) => p + 1);
        setInternalLoadingMore(false);
      }, 100);
    }
    onEndReached?.(info);
  };

  // Determine dynamic columns if responsiveColumns is enabled
  const computedColumns = useMemo(() => {
    if (customNumColumns) return customNumColumns;
    if (!responsiveColumns) return 1;
    if (isDesktop && width >= 1200) return 4;
    if (isDesktop) return 3;
    if (isTablet) return 2;
    return 1;
  }, [responsiveColumns, customNumColumns, isDesktop, isTablet, width]);

  // Robust, foolproof keyExtractor that prevents duplicate key warnings & re-render issues
  const safeKeyExtractor = useMemo(() => {
    return (item: T, index: number): string => {
      if (keyExtractor) {
        try {
          const userKey = keyExtractor(item, index);
          if (userKey !== undefined && userKey !== null && userKey !== "") {
            return String(userKey);
          }
        } catch (e) {
          // Fall through to safe extractor
        }
      }

      if (!item) return `empty-item-${index}`;
      const candidateKey =
        item.id ??
        item._id ??
        item.uuid ??
        item.key ??
        item.code ??
        item.slug ??
        item.ticket_id ??
        item.booking_id;

      if (candidateKey !== undefined && candidateKey !== null) {
        return String(candidateKey);
      }

      return `item-${index}`;
    };
  }, [keyExtractor]);

  // 1. Error state (Prioritized if no items present)
  if (error && (!data || data.length === 0)) {
    const isSlow = isSlowNetworkError(error);
    const resolvedTitle = isSlow
      ? "নেটওয়ার্ক খুব ধীরগতির"
      : "ডাটা লোড করা সম্ভব হয়নি";
    const resolvedMessage =
      typeof error === "string"
        ? error
        : error.message || "একটি নেটওয়ার্ক বা সার্ভার সমস্যা হয়েছে।";

    return (
      <View style={[styles.loadingContainer, containerStyle]}>
        <ErrorStateCard
          title={resolvedTitle}
          message={resolvedMessage}
          onRetry={onRetry}
          retryText={retryText}
        />
      </View>
    );
  }

  // 2. Loading state
  if (loading && (!data || data.length === 0)) {
    return (
      <View style={[styles.loadingContainer, containerStyle]}>
        <ListSkeleton count={skeletonCount} type={skeletonType} />
      </View>
    );
  }

  const items = data || [];

  // 3. Empty state
  const defaultEmptyComponent = (
    <EmptyStateView
      title={emptyTitle}
      description={emptySubtitle}
      icon={emptyIcon}
      actionText={onRetry ? "আবার চেষ্টা করুন" : undefined}
      onAction={onRetry}
    />
  );

  const defaultFooterComponent = isLoadingMore ? (
    <View style={styles.footerLoader}>
      <ActivityIndicator size="small" color="#287dfa" />
      <Text style={styles.footerLoaderText}>আরো লোড হচ্ছে...</Text>
    </View>
  ) : null;

  return (
    <FlatList<T>
      key={`optimized-list-${computedColumns}`} // Remount cleanly when column count changes
      data={pagedItems}
      renderItem={renderItem}
      keyExtractor={safeKeyExtractor}
      numColumns={computedColumns}
      columnWrapperStyle={computedColumns > 1 ? [styles.columnWrapper, columnWrapperStyle] : undefined}
      initialNumToRender={initialNumToRender}
      maxToRenderPerBatch={maxToRenderPerBatch}
      windowSize={windowSize}
      updateCellsBatchingPeriod={updateCellsBatchingPeriod}
      removeClippedSubviews={removeClippedSubviews ?? Platform.OS === "android"}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      onEndReached={handleEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      contentContainerStyle={[
        pagedItems.length === 0 ? styles.emptyGrow : undefined,
        contentContainerStyle,
      ]}
      ListEmptyComponent={ListEmptyComponent ?? defaultEmptyComponent}
      ListFooterComponent={ListFooterComponent ?? defaultFooterComponent}
      {...restProps}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 16,
  },
  columnWrapper: {
    gap: 16,
    justifyContent: "space-between",
  },
  emptyGrow: {
    flexGrow: 1,
    justifyContent: "center",
  },
  footerLoader: {
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  footerLoaderText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
});
