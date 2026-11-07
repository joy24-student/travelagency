/**
 * Deterministic & Collision-Resistant ID Generation Utilities
 */

let counter = 0;

/**
 * Generates unique channel subscription IDs for Supabase Realtime without relying on raw Math.random
 */
export function generateRealtimeChannelId(prefix = "channel"): string {
  counter = (counter + 1) % 1000000;
  const time = Date.now().toString(36);
  const count = counter.toString(36).padStart(4, "0");
  return `${prefix}-${time}-${count}`;
}

/**
 * Generates tracking and reference codes
 */
export function generateReferenceCode(prefix = "REF"): string {
  counter = (counter + 1) % 1000000;
  const time = Date.now().toString(36).toUpperCase();
  const count = counter.toString(36).toUpperCase().padStart(4, "0");
  return `${prefix}-${time}-${count}`;
}
