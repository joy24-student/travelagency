/**
 * Central Repositories Index
 * Exports decoupled Data Access Layer (DAL) components, interfaces, singletons & test mocks.
 * Supports feature-flagged mock repository layer for offline / testing modes.
 */

import { BookingRepository } from "./bookingRepository";
import { TravelRepository } from "./travelRepository";
import { UserRepository } from "./userRepository";
import {
  MockBookingRepository,
  MockTravelRepository,
  MockUserRepository,
} from "./mocks";
import type {
  IBookingRepository,
  ITravelRepository,
  IUserRepository,
} from "./types";

// Export repository classes and base implementation
export * from "./types";
export * from "./baseRepository";
export * from "./travelRepository";
export * from "./bookingRepository";
export * from "./userRepository";

// Preserve existing file repository
export * from "./fileRepository";

// Export unit test mocks
export * from "./mocks";

const checkMockEnabled = (): boolean => {
  return (
    process.env.EXPO_PUBLIC_USE_MOCK_REPOSITORY === "true" ||
    process.env.EXPO_PUBLIC_USE_MOCKS === "true"
  );
};

export const isMockDataEnabled = (): boolean => checkMockEnabled();

/**
 * Singleton repository instances wired according to feature flag.
 * If EXPO_PUBLIC_USE_MOCK_REPOSITORY=true, uses in-memory mock repositories.
 * Otherwise, uses live Supabase repositories.
 */
const useMocks = checkMockEnabled();

export const travelRepository: ITravelRepository = useMocks
  ? (new MockTravelRepository() as unknown as ITravelRepository)
  : new TravelRepository();

export const bookingRepository: IBookingRepository = useMocks
  ? (new MockBookingRepository() as unknown as IBookingRepository)
  : new BookingRepository();

export const userRepository: IUserRepository = useMocks
  ? (new MockUserRepository() as unknown as IUserRepository)
  : new UserRepository();
