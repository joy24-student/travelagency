/**
 * Offline-Capable E-Ticket Verification & Sync Queue Engine for Hotel Portal
 * 
 * Cryptographic Ed25519 offline validation using noble-ed25519.
 * Manages local revocation list, used list, scan queue, and batch synchronization.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";
import { supabase } from "../lib/supabase";

// Configure noble-ed25519 with pure JS SHA-512
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

// Bundled Public Key (NEVER EMBED THE PRIVATE KEY IN THE MOBILE APP)
const PUBLIC_KEY_HEX =
  process.env.EXPO_PUBLIC_TICKET_PUBLIC_KEY ||
  "70b511e90e27ee772c128f9f22a8e5bfe0510b898718a5c955d0976c42d9c2b6";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const STORAGE_KEYS = {
  SCANS_QUEUE: "@shopnojatra_hotel_scans_queue_v1",
  USED_TICKETS: "@shopnojatra_hotel_used_tickets_v1",
  REVOKED_TICKETS: "@shopnojatra_hotel_revoked_tickets_v1",
  LAST_SYNC: "@shopnojatra_hotel_scans_last_sync_v1",
};

export interface QueuedScan {
  id: string; // Client-generated UUID for idempotency
  ticket_id: string;
  scanner_device_id?: string;
  result: "valid" | "invalid" | "used" | "expired" | "revoked";
  scanned_at: string;
}

export interface ScanVerificationResult {
  isValid: boolean;
  resultCode: "valid" | "invalid" | "used" | "expired" | "revoked";
  title_en: string;
  title_bn: string;
  reason_en: string;
  reason_bn: string;
  ticket_id?: string;
  booking_id?: string;
  passenger_name?: string;
  service_type?: string;
  seat?: string | null;
  valid_from?: string;
  valid_to?: string;
  client_clock_note: string;
  client_clock_note_bn: string;
}

/**
 * Generate synthetic offline WAV tone data-URI
 */
function createWavDataUri(frequency: number, durationSec: number): string {
  const sampleRate = 8000;
  const numSamples = Math.floor(sampleRate * durationSec);
  const buffer = new Uint8Array(44 + numSamples);

  // RIFF header
  buffer.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
  const fileLen = 36 + numSamples;
  buffer[4] = fileLen & 0xff;
  buffer[5] = (fileLen >> 8) & 0xff;
  buffer[6] = (fileLen >> 16) & 0xff;
  buffer[7] = (fileLen >> 24) & 0xff;
  buffer.set([0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20], 8); // "WAVEfmt "
  buffer[16] = 16; buffer[17] = 0; buffer[18] = 0; buffer[19] = 0; // SubChunk1Size (16)
  buffer[20] = 1; buffer[21] = 0; // AudioFormat (1 = PCM)
  buffer[22] = 1; buffer[23] = 0; // NumChannels (1 = Mono)
  buffer[24] = sampleRate & 0xff;
  buffer[25] = (sampleRate >> 8) & 0xff;
  buffer[26] = (sampleRate >> 16) & 0xff;
  buffer[27] = (sampleRate >> 24) & 0xff;
  buffer[28] = sampleRate & 0xff;
  buffer[29] = (sampleRate >> 8) & 0xff;
  buffer[30] = (sampleRate >> 16) & 0xff;
  buffer[31] = (sampleRate >> 24) & 0xff;
  buffer[32] = 1; buffer[33] = 0; // BlockAlign
  buffer[34] = 8; buffer[35] = 0; // BitsPerSample (8)
  buffer.set([0x64, 0x61, 0x74, 0x61], 36); // "data"
  buffer[40] = numSamples & 0xff;
  buffer[41] = (numSamples >> 8) & 0xff;
  buffer[42] = (numSamples >> 16) & 0xff;
  buffer[43] = (numSamples >> 24) & 0xff;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const s = Math.sin(2 * Math.PI * frequency * t);
    buffer[44 + i] = Math.floor((s + 1) * 127.5);
  }

  let binary = "";
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return "data:audio/wav;base64," + btoa(binary);
}

const SUCCESS_SOUND_URI = createWavDataUri(880, 0.16); // High crisp beep
const ERROR_SOUND_URI = createWavDataUri(260, 0.35); // Low alert buzz

class HotelTicketVerificationService {
  private usedTicketsSet: Set<string> = new Set();
  private revokedTicketsSet: Set<string> = new Set();
  private isLoaded = false;

  constructor() {
    this.initStorage();
  }

  private async initStorage(): Promise<void> {
    try {
      const [usedJson, revokedJson] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USED_TICKETS),
        AsyncStorage.getItem(STORAGE_KEYS.REVOKED_TICKETS),
      ]);
      if (usedJson) {
        this.usedTicketsSet = new Set(JSON.parse(usedJson));
      }
      if (revokedJson) {
        this.revokedTicketsSet = new Set(JSON.parse(revokedJson));
      }
      this.isLoaded = true;
    } catch {
      this.isLoaded = true;
    }
  }

  private async playFeedback(isValid: boolean): Promise<void> {
    try {
      if (isValid) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const { sound } = await Audio.Sound.createAsync({ uri: SUCCESS_SOUND_URI });
        await sound.playAsync();
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        const { sound } = await Audio.Sound.createAsync({ uri: ERROR_SOUND_URI });
        await sound.playAsync();
      }
    } catch {
      // Audio or haptics unavailable on emulator or web
    }
  }

  private canonicalizePayload(payload: {
    booking_id: string;
    passenger_name: string;
    seat?: string | null;
    service_type: string;
    ticket_id: string;
    valid_from: string;
    valid_to: string;
  }): Uint8Array {
    const canonicalDict = {
      booking_id: String(payload.booking_id),
      passenger_name: String(payload.passenger_name),
      seat: payload.seat != null ? String(payload.seat) : null,
      service_type: String(payload.service_type),
      ticket_id: String(payload.ticket_id),
      valid_from: String(payload.valid_from),
      valid_to: String(payload.valid_to),
    };
    const sortedKeys = Object.keys(canonicalDict).sort();
    const sortedObj: Record<string, any> = {};
    for (const key of sortedKeys) {
      sortedObj[key] = (canonicalDict as any)[key];
    }
    const jsonStr = JSON.stringify(sortedObj);
    return new TextEncoder().encode(jsonStr);
  }

  /**
   * Verify scanned QR payload offline with Ed25519 cryptography
   */
  public async verifyTicketOffline(
    rawQrData: string,
    scannerDeviceId: string = "HOTEL-DESK-01"
  ): Promise<ScanVerificationResult> {
    if (!this.isLoaded) {
      await this.initStorage();
    }

    const now = new Date();
    const clockNote = `Checked against local device clock (${now.toISOString()}). Ensure device time is synced.`;
    const clockNoteBn = `ডিভাইসের স্থানীয় সময় (${now.toLocaleTimeString()}) অনুযায়ী যাচাইকৃত।`;

    let payload: any;
    try {
      payload = JSON.parse(rawQrData);
    } catch {
      await this.playFeedback(false);
      return {
        isValid: false,
        resultCode: "invalid",
        title_en: "INVALID TICKET",
        title_bn: "অবৈধ টিকেট",
        reason_en: "Damaged, unreadable, or corrupted QR payload format.",
        reason_bn: "ক্ষতিগ্রস্ত বা অশুদ্ধ কিউআর কোড ফরম্যাট।",
        client_clock_note: clockNote,
        client_clock_note_bn: clockNoteBn,
      };
    }

    // Required fields check (zero personal data beyond passenger name and seat)
    const ticketId = payload.ticket_id || payload.t;
    const bookingId = payload.booking_id || payload.b;
    const passengerName = payload.passenger_name || payload.n;
    const serviceType = payload.service_type || payload.s;
    const validFrom = payload.valid_from || payload.vf;
    const validTo = payload.valid_to || payload.vt;
    const seat = payload.seat ?? payload.st ?? null;
    const signature = payload.sig;

    if (!ticketId || !bookingId || !passengerName || !validFrom || !validTo || !signature) {
      await this.playFeedback(false);
      return {
        isValid: false,
        resultCode: "invalid",
        title_en: "INVALID TICKET",
        title_bn: "অবৈধ টিকেট",
        reason_en: "Missing critical security claims in ticket payload.",
        reason_bn: "টিকেটে প্রয়োজনীয় তথ্য অনুপস্থিত।",
        client_clock_note: clockNote,
        client_clock_note_bn: clockNoteBn,
      };
    }

    // 1. Cryptographic Ed25519 signature verification
    let isSigValid = false;
    try {
      const messageBytes = this.canonicalizePayload({
        ticket_id: ticketId,
        booking_id: bookingId,
        passenger_name: passengerName,
        service_type: serviceType,
        valid_from: validFrom,
        valid_to: validTo,
        seat: seat,
      });
      isSigValid = ed.verify(signature, messageBytes, PUBLIC_KEY_HEX);
    } catch {
      isSigValid = false;
    }

    if (!isSigValid) {
      await this.playFeedback(false);
      await this.enqueueScan({
        id: this.generateUUID(),
        ticket_id: ticketId,
        scanner_device_id: scannerDeviceId,
        result: "invalid",
        scanned_at: now.toISOString(),
      });
      return {
        isValid: false,
        resultCode: "invalid",
        title_en: "COUNTERFEIT / TAMPERED",
        title_bn: "জাল বা পরিবর্তিত টিকেট",
        reason_en: "Ed25519 digital signature check failed. Ticket payload was altered or forged.",
        reason_bn: "ডিজিটাল স্বাক্ষর যাচাই ব্যর্থ হয়েছে। টিকেটটি নকল বা এতে পরিবর্তন আনা হয়েছে।",
        ticket_id: ticketId,
        booking_id: bookingId,
        passenger_name: passengerName,
        service_type: serviceType,
        seat: seat,
        valid_from: validFrom,
        valid_to: validTo,
        client_clock_note: clockNote,
        client_clock_note_bn: clockNoteBn,
      };
    }

    // 2. Check Local Revocation List
    if (this.revokedTicketsSet.has(ticketId)) {
      await this.playFeedback(false);
      await this.enqueueScan({
        id: this.generateUUID(),
        ticket_id: ticketId,
        scanner_device_id: scannerDeviceId,
        result: "revoked",
        scanned_at: now.toISOString(),
      });
      return {
        isValid: false,
        resultCode: "revoked",
        title_en: "REVOKED TICKET",
        title_bn: "বাতিলকৃত টিকেট",
        reason_en: "This e-ticket has been revoked or cancelled by the provider.",
        reason_bn: "টিকেটটি কর্তৃপক্ষ কর্তৃক বাতিল করা হয়েছে।",
        ticket_id: ticketId,
        booking_id: bookingId,
        passenger_name: passengerName,
        service_type: serviceType,
        seat: seat,
        valid_from: validFrom,
        valid_to: validTo,
        client_clock_note: clockNote,
        client_clock_note_bn: clockNoteBn,
      };
    }

    // 3. Check Local Used List (Double Scan Prevention)
    if (this.usedTicketsSet.has(ticketId)) {
      await this.playFeedback(false);
      await this.enqueueScan({
        id: this.generateUUID(),
        ticket_id: ticketId,
        scanner_device_id: scannerDeviceId,
        result: "used",
        scanned_at: now.toISOString(),
      });
      return {
        isValid: false,
        resultCode: "used",
        title_en: "ALREADY USED (DOUBLE SCAN)",
        title_bn: "ইতিমধ্যে ব্যবহৃত টিকেট",
        reason_en: "Ticket has already been scanned. Re-entry or duplicate check-in prohibited.",
        reason_bn: "এই টিকেটটি ইতিমধ্যে স্ক্যান করা হয়েছে। দ্বিতীয়বার চেক-ইন প্রযোজ্য নয়।",
        ticket_id: ticketId,
        booking_id: bookingId,
        passenger_name: passengerName,
        service_type: serviceType,
        seat: seat,
        valid_from: validFrom,
        valid_to: validTo,
        client_clock_note: clockNote,
        client_clock_note_bn: clockNoteBn,
      };
    }

    // 4. Check Validity Dates (Explicitly noting client device clock)
    const fromDate = new Date(validFrom);
    const toDate = new Date(validTo);

    if (now < fromDate) {
      await this.playFeedback(false);
      return {
        isValid: false,
        resultCode: "invalid",
        title_en: "NOT YET ACTIVE",
        title_bn: "সময় এখনো কার্যকর হয়নি",
        reason_en: `Ticket check-in not active yet. Valid starting from ${fromDate.toLocaleDateString()}.`,
        reason_bn: `টিকেটের চেক-ইন তারিখ এখনো আসেনি (${fromDate.toLocaleDateString()})।`,
        ticket_id: ticketId,
        booking_id: bookingId,
        passenger_name: passengerName,
        service_type: serviceType,
        seat: seat,
        valid_from: validFrom,
        valid_to: validTo,
        client_clock_note: clockNote,
        client_clock_note_bn: clockNoteBn,
      };
    }

    if (now > toDate) {
      await this.playFeedback(false);
      await this.enqueueScan({
        id: this.generateUUID(),
        ticket_id: ticketId,
        scanner_device_id: scannerDeviceId,
        result: "expired",
        scanned_at: now.toISOString(),
      });
      return {
        isValid: false,
        resultCode: "expired",
        title_en: "EXPIRED TICKET",
        title_bn: "মেয়াদোত্তীর্ণ টিকেট",
        reason_en: `Ticket expired on ${toDate.toLocaleDateString()}.`,
        reason_bn: `টিকেটের মেয়াদ উত্তীর্ণ হয়ে গেছে (${toDate.toLocaleDateString()})।`,
        ticket_id: ticketId,
        booking_id: bookingId,
        passenger_name: passengerName,
        service_type: serviceType,
        seat: seat,
        valid_from: validFrom,
        valid_to: validTo,
        client_clock_note: clockNote,
        client_clock_note_bn: clockNoteBn,
      };
    }

    // 5. ALL CHECKS PASSED: TICKET IS VALID
    this.usedTicketsSet.add(ticketId);
    await AsyncStorage.setItem(
      STORAGE_KEYS.USED_TICKETS,
      JSON.stringify(Array.from(this.usedTicketsSet))
    );

    // Queue valid scan for sync
    await this.enqueueScan({
      id: this.generateUUID(),
      ticket_id: ticketId,
      scanner_device_id: scannerDeviceId,
      result: "valid",
      scanned_at: now.toISOString(),
    });

    await this.playFeedback(true);

    return {
      isValid: true,
      resultCode: "valid",
      title_en: "VALID HOTEL TICKET",
      title_bn: "বৈধ হোটেল ভাউচার",
      reason_en: "Guest Check-In Approved. Ed25519 signature and stay dates verified.",
      reason_bn: "গেস্ট চেক-ইন অনুমোদিত। ক্রিপ্টোগ্রাফিক স্বাক্ষর ও তারিখ সঠিক।",
      ticket_id: ticketId,
      booking_id: bookingId,
      passenger_name: passengerName,
      service_type: serviceType,
      seat: seat,
      valid_from: validFrom,
      valid_to: validTo,
      client_clock_note: clockNote,
      client_clock_note_bn: clockNoteBn,
    };
  }

  /**
   * Manual lookup by Ticket Code for damaged QR codes
   */
  public async lookupTicketManually(code: string): Promise<ScanVerificationResult> {
    const trimmed = code.trim();
    if (!trimmed) {
      return {
        isValid: false,
        resultCode: "invalid",
        title_en: "EMPTY CODE",
        title_bn: "কোড খালি",
        reason_en: "Please enter a valid Ticket ID or Booking Reference.",
        reason_bn: "অনুগ্রহ করে সঠিক টিকেট আইডি বা বুকিং রেফারেন্স লিখুন।",
        client_clock_note: "",
        client_clock_note_bn: "",
      };
    }

    if (this.usedTicketsSet.has(trimmed)) {
      return {
        isValid: false,
        resultCode: "used",
        title_en: "ALREADY USED",
        title_bn: "ইতিমধ্যে ব্যবহৃত টিকেট",
        reason_en: "This reservation was already checked in.",
        reason_bn: "এই বুকিংয়ে ইতিমধ্যে চেক-ইন সম্পন্ন হয়েছে।",
        ticket_id: trimmed,
        client_clock_note: "",
        client_clock_note_bn: "",
      };
    }

    if (this.revokedTicketsSet.has(trimmed)) {
      return {
        isValid: false,
        resultCode: "revoked",
        title_en: "REVOKED TICKET",
        title_bn: "বাতিলকৃত টিকেট",
        reason_en: "This ticket has been revoked by property administration.",
        reason_bn: "টিকেটটি বাতিল করা হয়েছে।",
        ticket_id: trimmed,
        client_clock_note: "",
        client_clock_note_bn: "",
      };
    }

    // Online verification fallback if connected
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const resp = await fetch(`${API_BASE_URL}/tickets/${trimmed}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (resp.ok) {
        const json = await resp.json();
        const tickets = json.data || [];
        if (tickets.length > 0) {
          const t = tickets[0];
          return await this.verifyTicketOffline(t.qr_payload);
        }
      }
    } catch {
      // Offline fallback
    }

    return {
      isValid: false,
      resultCode: "invalid",
      title_en: "MANUAL LOOKUP REQUIRED",
      title_bn: "ম্যানুয়াল অনুসন্ধান",
      reason_en: `Ticket code '${trimmed}' verified in local registry. Please check guest identity.`,
      reason_bn: `টিকেট কোড '${trimmed}' স্থানীয় ডাটাবেজে নেই। গেস্টের পরিচয়পত্র যাচাই করুন।`,
      ticket_id: trimmed,
      client_clock_note: "",
      client_clock_note_bn: "",
    };
  }

  /**
   * Queue a scan locally for batch upload
   */
  private async enqueueScan(scan: QueuedScan): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.SCANS_QUEUE);
      const queue: QueuedScan[] = raw ? JSON.parse(raw) : [];
      queue.push(scan);
      await AsyncStorage.setItem(STORAGE_KEYS.SCANS_QUEUE, JSON.stringify(queue));
    } catch {
      // Graceful fallback
    }
  }

  /**
   * Batch synchronize offline scans with backend and pull updated revocations
   */
  public async syncWithServer(): Promise<{ syncedCount: number; error?: string }> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.SCANS_QUEUE);
      const queue: QueuedScan[] = raw ? JSON.parse(raw) : [];

      const lastSync = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // 1. Upload pending scans batch
      let syncedCount = 0;
      if (queue.length > 0) {
        const uploadResp = await fetch(`${API_BASE_URL}/tickets/scans`, {
          method: "POST",
          headers,
          body: JSON.stringify({ scans: queue }),
        });

        if (uploadResp.ok) {
          syncedCount = queue.length;
          await AsyncStorage.removeItem(STORAGE_KEYS.SCANS_QUEUE);
        }
      }

      // 2. Pull server revocation list updates
      const revUrl = lastSync
        ? `${API_BASE_URL}/tickets/revocations?since=${encodeURIComponent(lastSync)}`
        : `${API_BASE_URL}/tickets/revocations`;

      const revResp = await fetch(revUrl, { headers });
      if (revResp.ok) {
        const revJson = await revResp.json();
        const serverRevocations: any[] = revJson.data?.revocations || [];
        for (const item of serverRevocations) {
          if (item.status === "revoked") {
            this.revokedTicketsSet.add(item.ticket_id);
          } else if (item.status === "used") {
            this.usedTicketsSet.add(item.ticket_id);
          }
        }

        await Promise.all([
          AsyncStorage.setItem(
            STORAGE_KEYS.REVOKED_TICKETS,
            JSON.stringify(Array.from(this.revokedTicketsSet))
          ),
          AsyncStorage.setItem(
            STORAGE_KEYS.USED_TICKETS,
            JSON.stringify(Array.from(this.usedTicketsSet))
          ),
          AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString()),
        ]);
      }

      return { syncedCount };
    } catch (err: any) {
      return { syncedCount: 0, error: err?.message || "Sync failed" };
    }
  }

  public async getPendingQueueCount(): Promise<number> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.SCANS_QUEUE);
      const queue = raw ? JSON.parse(raw) : [];
      return queue.length;
    } catch {
      return 0;
    }
  }

  private generateUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

export const hotelTicketVerificationService = new HotelTicketVerificationService();
