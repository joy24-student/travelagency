import { useCallback } from "react";
import { useMutation, useQuery } from "./useAuth";
import { bookingRepository } from "../services/repositories/booking";
import { offlineQueueService } from "../services/offline/offlineQueueService";
import { networkStatusService } from "../services/network/networkStatusService";
import { useBookingRealtimeSync } from "../services/bookingRealtimeService";

// Hook for user bookings with SWR cache and background revalidation
export const useUserBookings = (userId?: string, status?: string) => {
  const cacheKey = userId ? `user_bookings:${userId}:${status || "all"}` : undefined;

  const {
    data: bookings,
    loading,
    error,
    isStale,
    isCached,
    refetch,
  } = useQuery(
    async () => {
      if (!userId) return [];
      return await bookingRepository.getUserBookings(userId, status);
    },
    [userId, status],
    {
      enabled: !!userId,
      cacheKey,
      timeoutMs: 12000,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    },
  );

  // Supabase Realtime CDC Sync: Automatically refetch when any booking status changes
  useBookingRealtimeSync({
    userId,
    onStatusChange: () => {
      refetch();
    },
    onBookingCreated: () => {
      refetch();
    },
  });

  return {
    bookings: bookings || [],
    loading,
    error,
    isStale,
    isCached,
    refetch,
  };
};

// Hook for single booking
export const useBooking = (bookingId?: string) => {
  const cacheKey = bookingId ? `booking_detail:${bookingId}` : undefined;

  const {
    data: booking,
    loading,
    error,
    isStale,
    isCached,
    refetch,
  } = useQuery(
    async () => {
      if (!bookingId) return null;
      return await bookingRepository.getBooking(bookingId);
    },
    [bookingId],
    {
      enabled: !!bookingId,
      cacheKey,
      timeoutMs: 12000,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    },
  );

  // Single booking Realtime Sync
  useBookingRealtimeSync({
    onStatusChange: (payload) => {
      if (payload.bookingId === bookingId) {
        refetch();
      }
    },
  });

  return {
    booking,
    loading,
    error,
    isStale,
    isCached,
    refetch,
  };
};

// Hook for creating bookings with offline queue support
export const useCreateBooking = () => {
  const createMutation = useMutation(
    async ({ userId, booking }: { userId: string; booking: any }) => {
      // If offline, enqueue to offline mutation queue
      if (!networkStatusService.isOnline()) {
        await offlineQueueService.enqueue(
          "CREATE_BOOKING_DRAFT",
          { userId, booking },
          `বুকিং ড্রাফট (${booking.product_type || "ট্রিপ"})`
        );
        return {
          id: `offline_draft_${Date.now()}`,
          status: "offline_pending",
          booking_reference: `BK-OFF-${Date.now().toString(36).toUpperCase()}`,
          is_offline_pending: true,
          ...booking,
        };
      }

      try {
        return await bookingRepository.createBooking(userId, booking);
      } catch (err) {
        // If network failure during creation, enqueue as well
        await offlineQueueService.enqueue(
          "CREATE_BOOKING_DRAFT",
          { userId, booking },
          `বুকিং ড্রাফট (${booking.product_type || "ট্রিপ"})`
        );
        throw err;
      }
    },
  );

  return createMutation;
};

// Hook for booking actions
export const useBookingActions = () => {
  const cancelBookingMutation = useMutation(
    async ({ bookingId, reason }: { bookingId: string; reason?: string }) => {
      return await bookingRepository.cancelBooking(bookingId, reason || "");
    },
  );

  const confirmBookingMutation = useMutation(
    async ({ bookingId }: { bookingId: string }) => {
      return await bookingRepository.confirmBooking(bookingId);
    },
  );

  return {
    cancelBooking: cancelBookingMutation.mutate,
    confirmBooking: confirmBookingMutation.mutate,
    loading: cancelBookingMutation.loading || confirmBookingMutation.loading,
    error: cancelBookingMutation.error || confirmBookingMutation.error,
  };
};

// Hook for booking items
export const useBookingItems = (bookingId?: string) => {
  const {
    data: items,
    loading,
    error,
    refetch,
  } = useQuery(
    async () => {
      if (!bookingId) return [];
      return await bookingRepository.getBookingItems(bookingId);
    },
    [bookingId],
    { enabled: !!bookingId, cacheKey: bookingId ? `booking_items:${bookingId}` : undefined },
  );

  return {
    items: items || [],
    loading,
    error,
    refetch,
  };
};

// Hook for booking invoices
export const useBookingInvoices = (bookingId?: string) => {
  const {
    data: invoices,
    loading,
    error,
    refetch,
  } = useQuery(
    async () => {
      if (!bookingId) return [];
      return await bookingRepository.getBookingInvoices(bookingId);
    },
    [bookingId],
    { enabled: !!bookingId, cacheKey: bookingId ? `booking_invoices:${bookingId}` : undefined },
  );

  return {
    invoices: invoices || [],
    loading,
    error,
    refetch,
  };
};
