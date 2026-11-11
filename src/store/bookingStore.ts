/**
 * Booking Store (Zustand)
 * Multi-step checkout draft state, seat/room configurations, promo codes, and transactional submission.
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { bookingRepository } from "../repositories";
import {
  BookingDetails,
  BookingItemDTO,
  CreateBookingDTO,
  TravelerDTO,
} from "../repositories/types";
import { cachedStateStorage } from "./storage";

export type CheckoutStep = 1 | 2 | 3 | 4;

export interface AppliedPromoCode {
  code: string;
  discountAmount: number;
  discountType: "fixed" | "percentage";
  percentageValue?: number;
  description?: string;
}

export interface SelectedRoomOption {
  roomId: string;
  roomType: string;
  count: number;
  pricePerNight: number;
}

export interface BookingPricing {
  basePrice: number;
  taxAmount: number;
  serviceFee: number;
  discountAmount: number;
  finalPrice: number;
  currency: string;
}

export interface ScannedReceiptExpense {
  id: string;
  merchantName: string;
  totalAmount: number;
  currency: "BDT" | "USD" | "EUR" | "INR" | string;
  date: string;
  category: "Food & Dining" | "Local Transport" | "Shopping" | "Activities";
  confidence: number;
  imageUri?: string;
  notes?: string;
  splitWith?: string[];
  paidBy?: string;
  createdAt: string;
}

export interface BookingState {
  currentStep: CheckoutStep;

  // Selected item / product
  productType: "flight" | "hotel" | "train" | "tour" | "package";
  productId: string | null;
  destinationCity: string;
  destinationCountry?: string;
  startDate?: string;
  endDate?: string;
  numberOfGuests: number;

  // Multi-step configurations
  selectedSeats: string[];
  selectedRooms: SelectedRoomOption[];
  travelers: TravelerDTO[];
  appliedPromo: AppliedPromoCode | null;
  notes: string;

  // Itinerary Plan (Weather-Adaptive Itinerary State Synchronization)
  itineraryPlan?: any | null;

  // Pricing
  pricing: BookingPricing;

  // Submission State
  isSubmitting: boolean;
  submissionError: string | null;
  completedBooking: BookingDetails | null;

  // Scanned Receipt Expenses (Trip Budget Tracking)
  scannedExpenses: ScannedReceiptExpense[];

  // Actions
  setStep: (step: CheckoutStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  initDraft: (params: {
    productType: "flight" | "hotel" | "train" | "tour" | "package";
    productId: string;
    destinationCity: string;
    destinationCountry?: string;
    startDate?: string;
    endDate?: string;
    basePrice: number;
    currency?: string;
    numberOfGuests?: number;
  }) => void;
  setSelectedSeats: (seats: string[]) => void;
  setSelectedRooms: (rooms: SelectedRoomOption[]) => void;
  setTravelers: (travelers: TravelerDTO[]) => void;
  updateTraveler: (index: number, traveler: Partial<TravelerDTO>) => void;
  autoPopulateTravelerFromMRZ: (
    data: {
      firstName: string;
      lastName: string;
      passportNumber: string;
      nationality: string;
      expiryDate: string;
      dateOfBirth?: string;
      gender?: "male" | "female" | "other";
      nationalId?: string;
    },
    travelerIndex?: number,
  ) => void;
  addTraveler: (traveler: TravelerDTO) => void;
  removeTraveler: (index: number) => void;
  applyPromoCode: (
    code: string,
    discountAmount: number,
    discountType?: "fixed" | "percentage",
    percentageValue?: number,
  ) => void;
  removePromoCode: () => void;
  setNotes: (notes: string) => void;
  recalculatePricing: () => void;
  addScannedExpense: (
    expense: Omit<ScannedReceiptExpense, "id" | "createdAt"> & { id?: string }
  ) => ScannedReceiptExpense;
  removeScannedExpense: (id: string) => void;
  clearScannedExpenses: () => void;
  syncItineraryPlan: (plan: any) => void;
  submitBooking: (userId: string) => Promise<BookingDetails>;
  resetDraft: () => void;
}

const DEFAULT_PRICING: BookingPricing = {
  basePrice: 0,
  taxAmount: 0,
  serviceFee: 0,
  discountAmount: 0,
  finalPrice: 0,
  currency: "BDT",
};

export const useBookingStore = create<BookingState>()(
  persist(
    (set, get) => ({
      currentStep: 1,
      productType: "flight",
      productId: null,
      destinationCity: "",
      destinationCountry: undefined,
      startDate: undefined,
      endDate: undefined,
      numberOfGuests: 1,

      selectedSeats: [],
      selectedRooms: [],
      travelers: [],
      appliedPromo: null,
      notes: "",
      itineraryPlan: null,

      pricing: { ...DEFAULT_PRICING },

      isSubmitting: false,
      submissionError: null,
      completedBooking: null,
      scannedExpenses: [],

      setStep: (step) => set({ currentStep: step }),

      nextStep: () => {
        const current = get().currentStep;
        if (current < 4) {
          set({ currentStep: (current + 1) as CheckoutStep });
        }
      },

      prevStep: () => {
        const current = get().currentStep;
        if (current > 1) {
          set({ currentStep: (current - 1) as CheckoutStep });
        }
      },

      initDraft: (params) => {
        const base = Number(params.basePrice || 0);
        const tax = Math.round(base * 0.05); // 5% default tax
        const fee = Math.round(base * 0.02); // 2% service fee
        const finalPrice = base + tax + fee;

        set({
          currentStep: 1,
          productType: params.productType,
          productId: params.productId,
          destinationCity: params.destinationCity,
          destinationCountry: params.destinationCountry,
          startDate: params.startDate,
          endDate: params.endDate,
          numberOfGuests: params.numberOfGuests || 1,
          selectedSeats: [],
          selectedRooms: [],
          travelers: [],
          appliedPromo: null,
          notes: "",
          pricing: {
            basePrice: base,
            taxAmount: tax,
            serviceFee: fee,
            discountAmount: 0,
            finalPrice,
            currency: params.currency || "BDT",
          },
          submissionError: null,
          completedBooking: null,
        });
      },

      setSelectedSeats: (selectedSeats) => {
        set({ selectedSeats });
        get().recalculatePricing();
      },

      setSelectedRooms: (selectedRooms) => {
        set({ selectedRooms });
        get().recalculatePricing();
      },

      setTravelers: (travelers) => set({ travelers }),

      updateTraveler: (index, updatedData) => {
        set((state) => {
          const list = [...state.travelers];
          if (list[index]) {
            list[index] = { ...list[index], ...updatedData };
          }
          return { travelers: list };
        });
      },

      autoPopulateTravelerFromMRZ: (data, index = 0) => {
        set((state) => {
          const list = [...state.travelers];
          if (list[index]) {
            list[index] = {
              ...list[index],
              firstName: data.firstName || list[index].firstName,
              lastName: data.lastName || list[index].lastName,
              passportNumber: data.passportNumber || list[index].passportNumber,
              nationality: data.nationality || list[index].nationality,
              expiryDate: data.expiryDate || list[index].expiryDate,
              passportExpiry: data.expiryDate || list[index].passportExpiry,
              dateOfBirth: data.dateOfBirth || list[index].dateOfBirth,
              gender: data.gender || list[index].gender,
              nationalId: data.nationalId || list[index].nationalId,
            };
          } else {
            list[index] = {
              firstName: data.firstName || "",
              lastName: data.lastName || "",
              email: "",
              passportNumber: data.passportNumber,
              nationality: data.nationality,
              expiryDate: data.expiryDate,
              passportExpiry: data.expiryDate,
              dateOfBirth: data.dateOfBirth,
              gender: data.gender || "male",
              nationalId: data.nationalId,
              isPrimary: index === 0,
            };
          }
          return {
            travelers: list,
            numberOfGuests: Math.max(state.numberOfGuests, list.length),
          };
        });
      },

      addTraveler: (traveler) =>
        set((state) => ({
          travelers: [...state.travelers, traveler],
          numberOfGuests: Math.max(state.numberOfGuests, state.travelers.length + 1),
        })),

      removeTraveler: (index) =>
        set((state) => ({
          travelers: state.travelers.filter((_, i) => i !== index),
        })),

      applyPromoCode: (code, discountAmount, discountType = "fixed", percentageValue) => {
        set({
          appliedPromo: {
            code,
            discountAmount,
            discountType,
            percentageValue,
          },
        });
        get().recalculatePricing();
      },

      removePromoCode: () => {
        set({ appliedPromo: null });
        get().recalculatePricing();
      },

      setNotes: (notes) => set({ notes }),

      recalculatePricing: () => {
        const { pricing, appliedPromo, selectedRooms } = get();

        // Calculate room surcharge if multiple rooms selected
        let roomTotal = 0;
        if (selectedRooms.length > 0) {
          roomTotal = selectedRooms.reduce((acc, r) => acc + r.count * r.pricePerNight, 0);
        }

        const base = roomTotal > 0 ? roomTotal : pricing.basePrice;
        const tax = Math.round(base * 0.05);
        const fee = Math.round(base * 0.02);

        let discount = 0;
        if (appliedPromo) {
          if (appliedPromo.discountType === "percentage" && appliedPromo.percentageValue) {
            discount = Math.round((base * appliedPromo.percentageValue) / 100);
          } else {
            discount = appliedPromo.discountAmount;
          }
        }

        const finalPrice = Math.max(0, base + tax + fee - discount);

        set({
          pricing: {
            ...pricing,
            basePrice: base,
            taxAmount: tax,
            serviceFee: fee,
            discountAmount: discount,
            finalPrice,
          },
        });
      },

      submitBooking: async (userId: string): Promise<BookingDetails> => {
        const state = get();
        set({ isSubmitting: true, submissionError: null });

        try {
          const items: BookingItemDTO[] = [
            {
              productType: state.productType,
              productId: state.productId || "UNKNOWN",
              title: `${state.productType.toUpperCase()} - ${state.destinationCity}`,
              quantity: state.numberOfGuests,
              unitPrice: state.pricing.basePrice,
              totalPrice: state.pricing.basePrice,
              metadata: {
                selectedSeats: state.selectedSeats,
                selectedRooms: state.selectedRooms,
              },
            },
          ];

          const payload: CreateBookingDTO = {
            userId,
            productType: state.productType,
            destinationCity: state.destinationCity,
            destinationCountry: state.destinationCountry,
            startDate: state.startDate,
            endDate: state.endDate,
            numberOfGuests: state.numberOfGuests,
            totalPrice: state.pricing.basePrice,
            taxAmount: state.pricing.taxAmount,
            serviceFee: state.pricing.serviceFee,
            discountAmount: state.pricing.discountAmount,
            promoCode: state.appliedPromo?.code,
            currency: state.pricing.currency,
            notes: state.notes,
            travelers: state.travelers,
            items,
          };

          const bookingResult = await bookingRepository.createBooking(payload);

          set({
            isSubmitting: false,
            completedBooking: bookingResult,
            currentStep: 4,
          });

          return bookingResult;
        } catch (err: any) {
          const errorMsg = err?.message || "Booking creation failed";
          set({ isSubmitting: false, submissionError: errorMsg });
          throw err;
        }
      },

      addScannedExpense: (expense) => {
        const newExpense: ScannedReceiptExpense = {
          ...expense,
          id:
            expense.id ||
            `receipt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          scannedExpenses: [newExpense, ...state.scannedExpenses],
        }));
        return newExpense;
      },

      removeScannedExpense: (id) =>
        set((state) => ({
          scannedExpenses: state.scannedExpenses.filter((e) => e.id !== id),
        })),

      clearScannedExpenses: () => set({ scannedExpenses: [] }),

      syncItineraryPlan: (plan: any) => {
        const current = get();
        // Reconstruct package notes while strictly preserving productId, completedBooking, travelers, rooms, and pricing
        const activityLines = plan?.days
          ? plan.days
              .flatMap((d: any) =>
                (d.activities || []).map(
                  (a: any) =>
                    `• [Day ${d.day} ${a.time}] ${a.activity} (${a.location})${
                      a.notes ? ` [${a.notes}]` : ""
                    }${a.estimatedCost ? ` - Cost: ${a.estimatedCost}` : ""}`
                )
              )
              .join("\n")
          : "";

        const diningLines = plan?.days
          ? plan.days
              .flatMap((d: any) =>
                (d.meals || []).map(
                  (m: any) =>
                    `• [Day ${d.day} ${m.type.toUpperCase()}] ${m.suggestion}${
                      m.restaurant ? ` at ${m.restaurant}` : ""
                    }`
                )
              )
              .join("\n")
          : "";

        const packageSummary =
          `✈️ COMPLETE AI ITINERARY PACKAGE: ${plan?.title || "Custom Itinerary"}\n` +
          `📍 Destination: ${plan?.destination || current.destinationCity}\n` +
          `📅 Duration: ${plan?.durationDays || 3} Days | Guests: ${current.numberOfGuests}\n` +
          `💰 Total Budget: ${plan?.totalEstimatedCost || current.pricing.basePrice} ${plan?.currency || current.pricing.currency}\n\n` +
          `🏨 ACCOMMODATIONS:\n${
            current.selectedRooms.map((r) => `• ${r.roomType}`).join("\n") || "Curated Hotel Stay"
          }\n\n` +
          `🎟️ CURATED TOURS & ACTIVITIES (WEATHER & GOLDEN HOUR ADAPTED):\n${activityLines}\n\n` +
          `🍲 RECOMMENDED DINING:\n${diningLines}`;

        set({
          itineraryPlan: plan,
          notes: packageSummary,
        });
      },

      resetDraft: () => {
        set({
          currentStep: 1,
          productId: null,
          destinationCity: "",
          selectedSeats: [],
          selectedRooms: [],
          travelers: [],
          appliedPromo: null,
          notes: "",
          itineraryPlan: null,
          pricing: { ...DEFAULT_PRICING },
          isSubmitting: false,
          submissionError: null,
          completedBooking: null,
          scannedExpenses: [],
        });
      },
    }),
    {
      name: "booking_draft_store",
      storage: createJSONStorage(() => cachedStateStorage),
      partialize: (state) => ({
        currentStep: state.currentStep,
        productType: state.productType,
        productId: state.productId,
        destinationCity: state.destinationCity,
        destinationCountry: state.destinationCountry,
        startDate: state.startDate,
        endDate: state.endDate,
        numberOfGuests: state.numberOfGuests,
        selectedSeats: state.selectedSeats,
        selectedRooms: state.selectedRooms,
        travelers: state.travelers,
        appliedPromo: state.appliedPromo,
        pricing: state.pricing,
        notes: state.notes,
        itineraryPlan: state.itineraryPlan,
        scannedExpenses: state.scannedExpenses,
      }),
    },
  ),
);
