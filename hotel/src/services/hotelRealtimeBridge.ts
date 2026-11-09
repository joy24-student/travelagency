/**
 * Hotel Supabase Realtime Bridge
 *
 * Subscribes to Supabase Realtime updates on "bookings" and "hotel_rooms" tables,
 * enabling real-time cross-app synchronization (Consumer bookings / payments instantly
 * appear in Hotel Reservations & Dashboard).
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type ChangeCallback = (table: string, payload: any) => void;
const listeners = new Set<ChangeCallback>();

let bookingsChannel: RealtimeChannel | null = null;

export function initHotelRealtimeBridge(): () => void {
  teardownHotelRealtimeBridge();

  try {
    bookingsChannel = supabase
      .channel('hotel-realtime-bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        (payload) => {
          listeners.forEach((cb) => cb('bookings', payload));
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hotel_rooms',
        },
        (payload) => {
          listeners.forEach((cb) => cb('hotel_rooms', payload));
        }
      )
      .subscribe();
  } catch (err) {
    console.warn('[HotelRealtimeBridge] Subscription notice:', err);
  }

  return () => {
    teardownHotelRealtimeBridge();
  };
}

export function subscribeToHotelRealtime(callback: ChangeCallback): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function teardownHotelRealtimeBridge(): void {
  if (bookingsChannel) {
    supabase.removeChannel(bookingsChannel);
    bookingsChannel = null;
  }
}
