/**
 * Mock Booking Repository
 * In-memory transactional booking mock for offline development and unit tests.
 */

import {
  BookingDetails,
  BookingFilterOptions,
  BookingStatus,
  CreateBookingDTO,
  IBookingRepository,
  RepositoryError,
} from "../types";

export class MockBookingRepository implements IBookingRepository {
  private bookings: Map<string, BookingDetails> = new Map();
  public simulatedLatencyMs = 10;
  public shouldFail = false;
  public failureMessage = "Booking creation failed in mock";

  constructor(initialBookings: BookingDetails[] = []) {
    initialBookings.forEach((b) => this.bookings.set(b.id, b));
  }

  private async delay(): Promise<void> {
    if (this.simulatedLatencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.simulatedLatencyMs));
    }
    if (this.shouldFail) {
      throw new RepositoryError({
        message: this.failureMessage,
        code: "TRANSACTION_FAILED",
        statusCode: 500,
      });
    }
  }

  async createBooking(bookingData: CreateBookingDTO): Promise<BookingDetails> {
    await this.delay();

    const id = `booking-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const ref = `BK-MOCK-${Date.now().toString(36).toUpperCase()}`;

    const tax = Number(bookingData.taxAmount || 0);
    const fee = Number(bookingData.serviceFee || 0);
    const discount = Number(bookingData.discountAmount || 0);
    const total = Number(bookingData.totalPrice || 0);
    const finalPrice = Math.max(0, total + tax + fee - discount);

    const newBooking: BookingDetails = {
      id,
      booking_reference: ref,
      user_id: bookingData.userId,
      agency_id: bookingData.agencyId,
      product_type: bookingData.productType,
      status: "pending",
      destination_city: bookingData.destinationCity,
      destination_country: bookingData.destinationCountry,
      start_date: bookingData.startDate,
      end_date: bookingData.endDate,
      number_of_guests: bookingData.numberOfGuests,
      total_price: total,
      tax_amount: tax,
      service_fee: fee,
      discount_amount: discount,
      final_price: finalPrice,
      currency: bookingData.currency || "BDT",
      promo_code: bookingData.promoCode,
      notes: bookingData.notes,
      created_at: new Date().toISOString(),
      travelers: bookingData.travelers,
      items: bookingData.items,
    };

    this.bookings.set(id, newBooking);
    return newBooking;
  }

  async getBookingById(bookingId: string): Promise<BookingDetails | null> {
    await this.delay();
    return this.bookings.get(bookingId) || null;
  }

  async getUserBookings(
    userId: string,
    filters?: BookingFilterOptions,
  ): Promise<BookingDetails[]> {
    await this.delay();
    const list = Array.from(this.bookings.values()).filter((b) => b.user_id === userId);

    return list.filter((b) => {
      if (filters?.status && b.status !== filters.status) return false;
      if (filters?.productType && b.product_type !== filters.productType) return false;
      return true;
    });
  }

  async updateBookingStatus(
    bookingId: string,
    status: BookingStatus,
    _metadata?: Record<string, any>,
  ): Promise<BookingDetails> {
    await this.delay();
    const booking = this.bookings.get(bookingId);
    if (!booking) {
      throw new RepositoryError({
        message: `Booking ${bookingId} not found`,
        code: "NOT_FOUND",
        statusCode: 404,
      });
    }

    const updated: BookingDetails = {
      ...booking,
      status,
      updated_at: new Date().toISOString(),
    };

    this.bookings.set(bookingId, updated);
    return updated;
  }

  async cancelBooking(bookingId: string, reason?: string): Promise<BookingDetails> {
    return this.updateBookingStatus(bookingId, "cancelled", { reason });
  }

  clear(): void {
    this.bookings.clear();
  }
}
