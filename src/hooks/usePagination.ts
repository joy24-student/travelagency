import { useState, useMemo, useCallback, useEffect } from "react";

export interface UsePaginationOptions {
  pageSize?: number;
  initialPage?: number;
}

export interface UsePaginationReturn<T> {
  displayedItems: T[];
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => void;
  resetPagination: () => void;
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

/**
 * Universal pagination hook for React Native lists.
 * Slices large arrays progressively on scroll (infinite scrolling) to maintain 60fps,
 * reduce memory consumption, and prevent list cutoffs.
 */
export function usePagination<T>(
  items: readonly T[] | T[] | null | undefined,
  options: UsePaginationOptions = {}
): UsePaginationReturn<T> {
  const { pageSize = 12, initialPage = 1 } = options;
  const safeItems = useMemo(() => items || [], [items]);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [loadingMore, setLoadingMore] = useState(false);

  // Reset pagination when the underlying source dataset identity or length changes significantly
  useEffect(() => {
    setCurrentPage(initialPage);
  }, [safeItems.length, initialPage]);

  const totalCount = safeItems.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const displayedItems = useMemo(() => {
    return safeItems.slice(0, currentPage * pageSize);
  }, [safeItems, currentPage, pageSize]);

  const hasMore = displayedItems.length < totalCount;

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    // Microtask batching to preserve fluid scrolling
    setTimeout(() => {
      setCurrentPage((prev) => Math.min(totalPages, prev + 1));
      setLoadingMore(false);
    }, 120);
  }, [loadingMore, hasMore, totalPages]);

  const resetPagination = useCallback(() => {
    setCurrentPage(initialPage);
    setLoadingMore(false);
  }, [initialPage]);

  return {
    displayedItems,
    hasMore,
    loadingMore,
    loadMore,
    resetPagination,
    totalCount,
    currentPage,
    totalPages,
  };
}

export default usePagination;
