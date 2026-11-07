import { supabase } from "../../utils/supabase";

const bookingSelect = `
  *,
  traveler_details(*),
  booking_items(*),
  booking_passengers(*),
  booking_payments(*),
  invoices(*),
  vouchers(*),
  trip_timeline_events(*),
  refund_requests(*)
`;

const reference = (prefix: string) =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}`;

export const bookingRepository = {
  // Get all user bookings
  async getUserBookings(userId: string, status?: string) {
    let query = supabase
      .from("bookings")
      .select(bookingSelect)
      .eq("user_id", userId);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;
    return data || [];
  },

  // Get booking by ID
  async getBooking(bookingId: string) {
    const { data, error } = await supabase
      .from("bookings")
      .select(bookingSelect)
      .eq("id", bookingId)
      .single();

    if (error) throw error;
    return data;
  },

  async getBookingById(bookingId: string) {
    return this.getBooking(bookingId);
  },

  async getBookingItems(bookingId: string) {
    const { data, error } = await supabase
      .from("booking_items")
      .select("*")
      .eq("booking_id", bookingId);
    if (error) throw error;
    return data || [];
  },

  async getBookingInvoices(bookingId: string) {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("booking_id", bookingId);
    if (error) throw error;
    return data || [];
  },

  // Create booking
  async createBooking(userId: string, booking: any) {
    const finalPrice =
      booking.final_price ??
      Math.max(
        0,
        Number(booking.total_price ?? 0) +
          Number(booking.tax_amount ?? 0) +
          Number(booking.service_fee ?? 0) -
          Number(booking.discount_amount ?? 0),
      );

    const { data, error } = await supabase
      .from("bookings")
      .insert([
        {
          user_id: userId,
          ...booking,
          booking_reference: booking.booking_reference ?? reference("BK"),
          final_price: finalPrice,
          status: booking.status ?? "draft",
        },
      ])
      .select();

    if (error) throw error;
    return data?.[0];
  },

  async createTravelerDetails(userId: string, traveler: any) {
    const { data, error } = await supabase
      .from("traveler_details")
      .insert([{ user_id: userId, ...traveler }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateTravelerDetails(travelerId: string, traveler: any) {
    const { data, error } = await supabase
      .from("traveler_details")
      .update(traveler)
      .eq("id", travelerId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update booking
  async updateBooking(bookingId: string, booking: any) {
    const { data, error } = await supabase
      .from("bookings")
      .update(booking)
      .eq("id", bookingId)
      .select();

    if (error) throw error;
    return data?.[0];
  },

  // Confirm booking (set status to confirmed)
  async confirmBooking(bookingId: string) {
    const { data: booking, error: getError } = await supabase
      .from("bookings")
      .select(
        "id, user_id, booking_reference, final_price, currency, start_date, end_date",
      )
      .eq("id", bookingId)
      .single();

    if (getError) throw getError;

    const { data, error } = await supabase
      .from("bookings")
      .update({
        status: "confirmed",
        flow_step: "confirmed",
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .select();

    if (error) throw error;

    await this.addTimelineEvent(bookingId, booking.user_id, {
      event_type: "confirmed",
      title: "Booking confirmed",
      description: `Reference ${booking.booking_reference} is ready.`,
    });

    await this.generateInvoice(bookingId, booking.user_id, {
      subtotal: booking.final_price,
      total_amount: booking.final_price,
      currency: booking.currency,
    });

    await this.createVoucher(bookingId, booking.user_id, {
      valid_from: booking.start_date,
      valid_until: booking.end_date,
    });

    return data?.[0];
  },

  // Cancel booking
  async cancelBooking(bookingId: string, reason?: string) {
    const { data: booking, error: getError } = await supabase
      .from("bookings")
      .select("id, user_id")
      .eq("id", bookingId)
      .single();

    if (getError) throw getError;

    // Update booking status
    const { data, error } = await supabase
      .from("bookings")
      .update({
        status: "cancelled",
        flow_step: "cancelled",
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .select();

    if (error) throw error;

    // Record cancellation
    await supabase.from("booking_cancellations").insert([
      {
        booking_id: bookingId,
        user_id: booking.user_id,
        cancellation_reason: reason,
      },
    ]);

    return data?.[0];
  },

  // Add booking item
  async addBookingItem(bookingId: string, item: any) {
    const { data, error } = await supabase
      .from("booking_items")
      .insert([{ booking_id: bookingId, ...item }])
      .select();

    if (error) throw error;
    return data?.[0];
  },

  // Add passenger
  async addPassenger(bookingId: string, passenger: any) {
    const { data, error } = await supabase
      .from("booking_passengers")
      .insert([{ booking_id: bookingId, ...passenger }])
      .select();

    if (error) throw error;
    return data?.[0];
  },

  // Create payment
  async createPayment(bookingId: string, payment: any) {
    const { data, error } = await supabase
      .from("booking_payments")
      .insert([{ booking_id: bookingId, ...payment }])
      .select();

    if (error) throw error;
    return data?.[0];
  },

  // Update payment status
  async updatePaymentStatus(
    paymentId: string,
    status: string,
    transactionId?: string,
  ) {
    const { data, error } = await supabase
      .from("booking_payments")
      .update({
        payment_status: status,
        transaction_id: transactionId,
        processed_at: new Date().toISOString(),
      })
      .eq("id", paymentId)
      .select();

    if (error) throw error;
    return data?.[0];
  },

  async generateInvoice(bookingId: string, userId: string, invoice: any = {}) {
    const { data, error } = await supabase
      .from("invoices")
      .upsert(
        [
          {
            booking_id: bookingId,
            user_id: userId,
            invoice_number: invoice.invoice_number ?? reference("INV"),
            ...invoice,
          },
        ],
        { onConflict: "booking_id" },
      )
      .select()
      .single();

    if (error) throw error;
    await this.addTimelineEvent(bookingId, userId, {
      event_type: "invoice_issued",
      title: "Invoice issued",
      description: data.invoice_number,
    });
    return data;
  },

  async createVoucher(bookingId: string, userId: string, voucher: any = {}) {
    const { data, error } = await supabase
      .from("vouchers")
      .upsert(
        [
          {
            booking_id: bookingId,
            user_id: userId,
            voucher_code: voucher.voucher_code ?? reference("VCH"),
            qr_payload: voucher.qr_payload ?? bookingId,
            redemption_instructions:
              voucher.redemption_instructions ??
              "Show this voucher at check-in or boarding.",
            ...voucher,
          },
        ],
        { onConflict: "booking_id" },
      )
      .select()
      .single();

    if (error) throw error;
    await this.addTimelineEvent(bookingId, userId, {
      event_type: "voucher_issued",
      title: "Voucher issued",
      description: data.voucher_code,
    });
    return data;
  },

  async addTimelineEvent(bookingId: string, userId: string, event: any) {
    const { data, error } = await supabase
      .from("trip_timeline_events")
      .insert([{ booking_id: bookingId, user_id: userId, ...event }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getTimeline(bookingId: string) {
    const { data, error } = await supabase
      .from("trip_timeline_events")
      .select("*")
      .eq("booking_id", bookingId)
      .order("event_at", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async requestRefund(bookingId: string, userId: string, refund: any) {
    const { data, error } = await supabase
      .from("refund_requests")
      .insert([{ booking_id: bookingId, user_id: userId, ...refund }])
      .select()
      .single();

    if (error) throw error;

    await this.addTimelineEvent(bookingId, userId, {
      event_type: "refund_requested",
      title: "Refund requested",
      description: refund.reason,
      metadata: { refund_request_id: data.id, amount: data.amount },
    });

    await supabase
      .from("bookings")
      .update({ flow_step: "refund" })
      .eq("id", bookingId);

    return data;
  },

  async updateRefundStatus(
    refundId: string,
    status: string,
    reviewerNotes?: string,
  ) {
    const { data, error } = await supabase
      .from("refund_requests")
      .update({
        status,
        reviewer_notes: reviewerNotes,
        resolved_at: ["approved", "rejected", "cancelled"].includes(status)
          ? new Date().toISOString()
          : undefined,
        paid_at: status === "paid" ? new Date().toISOString() : undefined,
      })
      .eq("id", refundId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async completeBookingFlow(userId: string, payload: any) {
    const traveler = await this.createTravelerDetails(userId, payload.traveler);
    const booking = await this.createBooking(userId, {
      traveler_id: traveler.id,
      flow_step: "passenger_details",
      ...payload.booking,
    });

    await this.addTimelineEvent(booking.id, userId, {
      event_type: "created",
      title: "Booking started",
      description: booking.destination_city,
    });

    for (const passenger of payload.passengers ?? []) {
      await this.addPassenger(booking.id, passenger);
    }

    for (const item of payload.items ?? []) {
      await this.addBookingItem(booking.id, item);
    }

    const payment = await this.createPayment(booking.id, {
      amount: booking.final_price,
      currency: booking.currency,
      payment_status: "completed",
      payment_method: payload.payment?.payment_method ?? "card",
      transaction_id: payload.payment?.transaction_id ?? reference("TXN"),
      payment_gateway: payload.payment?.payment_gateway ?? "manual",
      processed_at: new Date().toISOString(),
    });

    await this.addTimelineEvent(booking.id, userId, {
      event_type: "payment_completed",
      title: "Payment completed",
      description: `${payment.currency} ${payment.amount}`,
    });

    return await this.confirmBooking(booking.id);
  },
};
