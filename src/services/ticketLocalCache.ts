/**
 * Local SQLite Ticket Cache Service
 * 
 * Provides offline-first persistence for travel tickets.
 * Ensures e-tickets open instantly even with zero network connectivity.
 */

import * as SQLite from "expo-sqlite";

export interface CachedTicket {
  id: string;
  booking_id: string;
  passenger_name: string;
  service_type: string;
  valid_from: string;
  valid_to: string;
  seat: string | null;
  status: "active" | "used" | "revoked" | "expired";
  signature: string;
  qr_payload: string;
  created_at: string;
  cached_at: string;
}

let dbInstance: SQLite.SQLiteDatabase | null = null;

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync("shopnojatra_tickets.db");
    await dbInstance.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS cached_tickets (
        id TEXT PRIMARY KEY NOT NULL,
        booking_id TEXT NOT NULL,
        passenger_name TEXT NOT NULL,
        service_type TEXT NOT NULL,
        valid_from TEXT NOT NULL,
        valid_to TEXT NOT NULL,
        seat TEXT,
        status TEXT NOT NULL,
        signature TEXT NOT NULL,
        qr_payload TEXT NOT NULL,
        created_at TEXT NOT NULL,
        cached_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_cached_booking_id ON cached_tickets(booking_id);
      CREATE INDEX IF NOT EXISTS idx_cached_status ON cached_tickets(status);
    `);
  }
  return dbInstance;
}

export const ticketLocalCache = {
  /**
   * Upsert a list of tickets into local SQLite storage
   */
  async saveTickets(tickets: CachedTicket[]): Promise<void> {
    try {
      const db = await getDatabase();
      for (const t of tickets) {
        await db.runAsync(
          `INSERT OR REPLACE INTO cached_tickets (
            id, booking_id, passenger_name, service_type,
            valid_from, valid_to, seat, status, signature,
            qr_payload, created_at, cached_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            t.id,
            t.booking_id,
            t.passenger_name,
            t.service_type,
            t.valid_from,
            t.valid_to,
            t.seat ?? null,
            t.status,
            t.signature,
            t.qr_payload,
            t.created_at,
            new Date().toISOString(),
          ]
        );
      }
    } catch {
      // Graceful fallback for non-fatal SQLite errors
    }
  },

  /**
   * Retrieve cached tickets by booking ID
   */
  async getTicketsByBooking(bookingId: string): Promise<CachedTicket[]> {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<CachedTicket>(
        `SELECT * FROM cached_tickets WHERE booking_id = ? ORDER BY created_at ASC;`,
        [bookingId]
      );
      return rows || [];
    } catch {
      return [];
    }
  },

  /**
   * Retrieve a specific cached ticket by ID
   */
  async getTicketById(ticketId: string): Promise<CachedTicket | null> {
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<CachedTicket>(
        `SELECT * FROM cached_tickets WHERE id = ?;`,
        [ticketId]
      );
      return row || null;
    } catch {
      return null;
    }
  },

  /**
   * Retrieve all locally cached tickets
   */
  async getAllTickets(): Promise<CachedTicket[]> {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<CachedTicket>(
        `SELECT * FROM cached_tickets ORDER BY valid_from DESC;`
      );
      return rows || [];
    } catch {
      return [];
    }
  },

  /**
   * Update the status of a cached ticket (e.g. used, revoked, expired)
   */
  async updateTicketStatus(ticketId: string, status: CachedTicket["status"]): Promise<void> {
    try {
      const db = await getDatabase();
      await db.runAsync(
        `UPDATE cached_tickets SET status = ?, cached_at = ? WHERE id = ?;`,
        [status, new Date().toISOString(), ticketId]
      );
    } catch {
      // Graceful fallback
    }
  },
};
