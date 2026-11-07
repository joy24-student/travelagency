import { MockBookingRepository } from "../mocks/mockBookingRepository";
import { CreateBookingDTO, BookingStatus } from "../types";

describe("Booking Repository & State Flow", () => {
  let bookingRepo: MockBookingRepository;

  beforeEach(() => {
    bookingRepo = new MockBookingRepository();
    bookingRepo.simulatedLatencyMs = 0; // zero delay for fast unit tests
  });

  const sampleBookingDTO: CreateBookingDTO = {
    userId: "user-456",
    packageId: "pkg-sundarbans-adventure",
    totalPrice: 15000,
    serviceFee: 500,
    taxAmount: 750,
    discountAmount: 1000,
    currency: "BDT",
    travelers: [
      {
        firstName: "Rahim",
        lastName: "Uddin",
        type: "adult",
        documentType: "nid",
        documentNumber: "1234567890",
      },
    ],
  };

  describe("createBooking", () => {
    it("should atomically initialize a booking with pending status and correct totals", async () => {
      const booking = await bookingRepo.createBooking(sampleBookingDTO);

      expect(booking).toBeDefined();
      expect(booking.id).toBeDefined();
      expect(booking.booking_reference).toMatch(/^BK-MOCK-/);
      expect(booking.user_id).toBe("user-456");
      expect(booking.status).toBe("pending");
      expect(booking.currency).toBe("BDT");

      // Math: 15000 (total) + 750 (tax) + 500 (fee) - 1000 (discount) = 15250
      expect(booking.final_price).toBe(15250);
      expect(booking.travelers).toHaveLength(1);
      expect(booking.travelers?.[0].firstName).toBe("Rahim");
    });

    it("should throw a RepositoryError when transaction fails", async () => {
      bookingRepo.shouldFail = true;
      bookingRepo.failureMessage = "Lock acquisition failed on seat allocation";

      await expect(bookingRepo.createBooking(sampleBookingDTO)).rejects.toThrow(
        "Lock acquisition failed on seat allocation"
      );
    });
  });

  describe("Booking State Machine Transitions", () => {
    it("should transition status from pending to confirmed, then to cancelled", async () => {
      const booking = await bookingRepo.createBooking(sampleBookingDTO);
      expect(booking.status).toBe("pending");

      // Confirm booking
      const confirmed = await bookingRepo.updateBookingStatus(
        booking.id,
        "confirmed" as BookingStatus
      );
      expect(confirmed.status).toBe("confirmed");

      // Cancel booking
      const cancelled = await bookingRepo.cancelBooking(
        booking.id,
        "Traveler requested refund"
      );
      expect(cancelled.status).toBe("cancelled");
    });
  });

  describe("Query & Filtering", () => {
    it("should retrieve bookings by user ID", async () => {
      await bookingRepo.createBooking(sampleBookingDTO);
      await bookingRepo.createBooking({
        ...sampleBookingDTO,
        userId: "user-different",
      });

      const userBookings = await bookingRepo.getUserBookings("user-456");
      expect(userBookings.length).toBe(1);
      expect(userBookings[0].user_id).toBe("user-456");
    });

    it("should filter bookings by status", async () => {
      const b1 = await bookingRepo.createBooking(sampleBookingDTO);
      const b2 = await bookingRepo.createBooking(sampleBookingDTO);

      await bookingRepo.updateBookingStatus(b1.id, "confirmed" as BookingStatus);

      const confirmedOnly = await bookingRepo.getUserBookings("user-456", {
        status: "confirmed" as BookingStatus,
      });
      expect(confirmedOnly.length).toBe(1);
      expect(confirmedOnly[0].id).toBe(b1.id);
    });
  });
});
