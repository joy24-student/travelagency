/**
 * Central Repositories Index
 * Exports decoupled Data Access Layer (DAL) components, interfaces, singletons & test mocks.
 */

import { BookingRepository } from "./bookingRepository";
import { TravelRepository } from "./travelRepository";
import { UserRepository } from "./userRepository";

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

// Default singleton instances wired to hardened Supabase client
export const travelRepository = new TravelRepository();
export const bookingRepository = new BookingRepository();
export const userRepository = new UserRepository();
