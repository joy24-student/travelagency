/**
 * Booking Repository
 * Enterprise transaction-safe booking manager with relationship joins & compensating rollbacks.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../utils/supabase";
import { BaseRepository } from "./baseRepository";
import {
  BookingDetails,
  BookingFilterOptions,
  BookingItemDTO,
  BookingStatus,
  CreateBookingDTO,
  IBookingRepository,
  RepositoryError,
  TravelerDTO,
} from "./types";

const BOOKING_SELECT_EXPANDED = `
  *,
  traveler_details(*),
  booking_items(*),
  booking_passengers(*),
  booking_payments(*),
  invoices(*),
  vouchers(*),
  trip_timeline_events(*)
`;

export class BookingRepository
  extends BaseRepository<any>
  implements IBookingRepository
{
  constructor(customClient?: SupabaseClient) {
    super("bookings", BOOKING_SELECT_EXPANDED, customClient);
  }

  private generateBookingReference(prefix = "BK"): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  // ==========================================================================
  // CREATE BOOKING (TRANSACTION / ORCHESTRATED WITH COMPENSATING ROLLBACK)
  // ==========================================================================

  async createBooking(bookingData: CreateBookingDTO): Promise<BookingDetails> {
    const bookingRef = this.generateBookingReference();
    const tax = Number(bookingData.taxAmount || 0);
    const serviceFee = Number(bookingData.serviceFee || 0);
    const discount = Number(bookingData.discountAmount || 0);
    const baseTotal = Number(bookingData.totalPrice || 0);
    const finalPrice = Math.max(0, baseTotal + tax + serviceFee - discount);

    // 1. Attempt Database Transaction via Supabase RPC (Stored Procedure)
    try {
      const { data: rpcResult, error: rpcError } = await this.client.rpc(
        "create_complete_booking",
        {
          p_user_id: bookingData.userId,
          p_agency_id: bookingData.agencyId || null,
          p_product_type: bookingData.productType,
          p_destination_city: bookingData.destinationCity,
          p_destination_country: bookingData.destinationCountry || null,
          p_start_date: bookingData.startDate || null,
          p_end_date: bookingData.endDate || null,
          p_number_of_guests: bookingData.numberOfGuests,
          p_total_price: baseTotal,
          p_tax_amount: tax,
          p_service_fee: serviceFee,
          p_discount_amount: discount,
          p_final_price: finalPrice,
          p_currency: bookingData.currency || "BDT",
          p_booking_reference: bookingRef,
          p_notes: bookingData.notes || null,
          p_travelers: bookingData.travelers,
          p_items: bookingData.items || [],
        },
      );

      if (!rpcError && rpcResult) {
        return this.mapToBookingDetails(rpcResult);
      }
    } catch {
      // RPC not configured or unavailable in local schema, fall through to orchestrated transaction
    }

    // 2. Client-Orchestrated Transaction with Compensating Rollback
    let createdBookingId: string | null = null;

    try {
      // Step A: Insert root booking
      const { data: bookingRow, error: bookingError } = await this.client
        .from("bookings")
        .insert({
          user_id: bookingData.userId,
          agency_id: bookingData.agencyId || null,
          booking_reference: bookingRef,
          product_type: bookingData.productType,
          destination_city: bookingData.destinationCity,
          destination_country: bookingData.destinationCountry || null,
          start_date: bookingData.startDate || null,
          end_date: bookingData.endDate || null,
          number_of_guests: bookingData.numberOfGuests,
          total_price: baseTotal,
          tax_amount: tax,
          service_fee: serviceFee,
          discount_amount: discount,
          final_price: finalPrice,
          currency: bookingData.currency || "BDT",
          status: "pending",
          promo_code: bookingData.promoCode || null,
          notes: bookingData.notes || null,
        })
        .select()
        .single();

      if (bookingError || !bookingRow) {
        throw this.normalizeError(bookingError, "createBooking.insertBooking");
      }

      createdBookingId = bookingRow.id;

      // Step B: Insert travelers (atomic batch)
      if (bookingData.travelers && bookingData.travelers.length > 0) {
        const travelerRows = bookingData.travelers.map((t) => ({
          booking_id: createdBookingId,
          first_name: t.firstName,
          last_name: t.lastName,
          email: t.email,
          phone: t.phone || null,
          passport_number: t.passportNumber || null,
          national_id: t.nationalId || null,
          date_of_birth: t.dateOfBirth || null,
          gender: t.gender || null,
        }));

        const { error: travelersError } = await this.client
          .from("traveler_details")
          .insert(travelerRows);

        if (travelersError) {
          throw this.normalizeError(travelersError, "createBooking.insertTravelers");
        }
      }

      // Step C: Insert booking items (line items)
      if (bookingData.items && bookingData.items.length > 0) {
        const itemRows = bookingData.items.map((item) => ({
          booking_id: createdBookingId,
          product_type: item.productType,
          product_id: item.productId,
          title: item.title,
          description: item.description || null,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          metadata: item.metadata || {},
        }));

        const { error: itemsError } = await this.client
          .from("booking_items")
          .insert(itemRows);

        if (itemsError) {
          throw this.normalizeError(itemsError, "createBooking.insertItems");
        }
      }

      // Step D: Add initial trip timeline event
      try {
        await this.client
          .from("trip_timeline_events")
          .insert({
            booking_id: createdBookingId,
            title: "Booking Initiated",
            description: `Booking reference ${bookingRef} created successfully`,
            status: "completed",
            event_time: new Date().toISOString(),
          });
      } catch {
        // Non-critical audit trail
      }

      // Fetch the complete aggregated record
      const fullBooking = await this.getBookingById(createdBookingId!);
      if (!fullBooking) {
        throw new RepositoryError({
          message: "Booking was created but could not be re-fetched",
          code: "DATABASE_ERROR",
          statusCode: 500,
        });
      }

      return fullBooking;
    } catch (err) {
      // Compensating Transaction (Rollback): clean up orphaned records if partial failure occurred
      if (createdBookingId) {
        await Promise.allSettled([
          this.client.from("booking_items").delete().eq("booking_id", createdBookingId),
          this.client.from("traveler_details").delete().eq("booking_id", createdBookingId),
          this.client.from("trip_timeline_events").delete().eq("booking_id", createdBookingId),
          this.client.from("bookings").delete().eq("id", createdBookingId),
        ]);
      }

      throw this.normalizeError(err, "createBooking");
    }
  }

  // ==========================================================================
  // GET BOOKING BY ID
  // ==========================================================================

  async getBookingById(bookingId: string): Promise<BookingDetails | null> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select(BOOKING_SELECT_EXPANDED)
        .eq("id", bookingId)
        .maybeSingle();

      if (error) {
        throw this.normalizeError(error, `getBookingById(${bookingId})`);
      }

      if (!data) return null;
      return this.mapToBookingDetails(data);
    } catch (err) {
      throw this.normalizeError(err, `getBookingById(${bookingId})`);
    }
  }

  // ==========================================================================
  // GET USER BOOKINGS
  // ==========================================================================

  async getUserBookings(
    userId: string,
    filters?: BookingFilterOptions,
  ): Promise<BookingDetails[]> {
    try {
      let query = this.client
        .from(this.tableName)
        .select(BOOKING_SELECT_EXPANDED)
        .eq("user_id", userId);

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.productType) {
        query = query.eq("product_type", filters.productType);
      }

      const offset = filters?.offset || 0;
      const limit = filters?.limit || 20;

      query = query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        throw this.normalizeError(error, `getUserBookings(${userId})`);
      }

      return (data || []).map((row) => this.mapToBookingDetails(row));
    } catch (err) {
      throw this.normalizeError(err, `getUserBookings(${userId})`);
    }
  }

  // ==========================================================================
  // UPDATE STATUS
  // ==========================================================================

  async updateBookingStatus(
    bookingId: string,
    status: BookingStatus,
    metadata?: Record<string, any>,
  ): Promise<BookingDetails> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .update({
          status,
          updated_at: new Date().toISOString(),
          ...(metadata ? { metadata } : {}),
        })
        .eq("id", bookingId)
        .select(BOOKING_SELECT_EXPANDED)
        .single();

      if (error) {
        throw this.normalizeError(error, `updateBookingStatus(${bookingId}, ${status})`);
      }

      // Add timeline event
      try {
        await this.client
          .from("trip_timeline_events")
          .insert({
            booking_id: bookingId,
            title: `Status changed to ${status.toUpperCase()}`,
            description: metadata?.reason || `Booking status updated to ${status}`,
            status: "completed",
            event_time: new Date().toISOString(),
          });
      } catch {
        // Non-critical audit trail
      }

      return this.mapToBookingDetails(data);
    } catch (err) {
      throw this.normalizeError(err, `updateBookingStatus(${bookingId})`);
    }
  }

  // ==========================================================================
  // CANCEL BOOKING
  // ==========================================================================

  async cancelBooking(bookingId: string, reason?: string): Promise<BookingDetails> {
    return this.updateBookingStatus(bookingId, "cancelled", { reason });
  }

  // ==========================================================================
  // MAPPER HELPER
  // ==========================================================================

  private mapToBookingDetails(raw: any): BookingDetails {
    const rawTravelers = raw.traveler_details || raw.booking_passengers || [];
    const rawItems = raw.booking_items || [];

    const travelers: TravelerDTO[] = Array.isArray(rawTravelers)
      ? rawTravelers.map((t: any) => ({
          firstName: t.first_name || "",
          lastName: t.last_name || "",
          email: t.email || "",
          phone: t.phone,
          passportNumber: t.passport_number,
          nationalId: t.national_id,
          dateOfBirth: t.date_of_birth,
          gender: t.gender,
        }))
      : [];

    const items: BookingItemDTO[] = Array.isArray(rawItems)
      ? rawItems.map((item: any) => ({
          productType: item.product_type || "flight",
          productId: item.product_id || "",
          title: item.title || "",
          description: item.description,
          quantity: Number(item.quantity || 1),
          unitPrice: Number(item.unit_price || 0),
          totalPrice: Number(item.total_price || 0),
          metadata: item.metadata,
        }))
      : [];

    return {
      id: raw.id,
      booking_reference: raw.booking_reference || "BK-UNKNOWN",
      user_id: raw.user_id,
      agency_id: raw.agency_id,
      product_type: raw.product_type || "flight",
      status: raw.status || "pending",
      destination_city: raw.destination_city || "",
      destination_country: raw.destination_country,
      start_date: raw.start_date,
      end_date: raw.end_date,
      number_of_guests: Number(raw.number_of_guests || 1),
      total_price: Number(raw.total_price || 0),
      tax_amount: Number(raw.tax_amount || 0),
      service_fee: Number(raw.service_fee || 0),
      discount_amount: Number(raw.discount_amount || 0),
      final_price: Number(raw.final_price || raw.total_price || 0),
      currency: raw.currency || "BDT",
      promo_code: raw.promo_code,
      notes: raw.notes,
      created_at: raw.created_at || new Date().toISOString(),
      updated_at: raw.updated_at,
      travelers,
      items,
    };
  }
}
