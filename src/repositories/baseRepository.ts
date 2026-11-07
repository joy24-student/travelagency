/**
 * Base Repository
 * Generic CRUD implementation with normalized error handling and Supabase abstraction.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../utils/supabase";
import {
  ErrorCode,
  IBaseRepository,
  QueryOptions,
  RepositoryError,
} from "./types";

export abstract class BaseRepository<
  T extends Record<string, any>,
  TId = string,
  TCreate = Partial<T>,
  TUpdate = Partial<T>,
> implements IBaseRepository<T, TId, TCreate, TUpdate>
{
  protected readonly client: SupabaseClient;
  protected readonly tableName: string;
  protected readonly defaultSelect: string;

  constructor(tableName: string, defaultSelect: string = "*", customClient?: SupabaseClient) {
    this.tableName = tableName;
    this.defaultSelect = defaultSelect;
    this.client = customClient || supabase;
  }

  /**
   * Normalizes Supabase / PostgreSQL / Network errors into standard RepositoryError.
   */
  public normalizeError(error: unknown, context?: string): RepositoryError {
    if (error instanceof RepositoryError) {
      return error;
    }

    const prefix = context ? `[${this.tableName}:${context}] ` : `[${this.tableName}] `;
    const rawError = error as any;

    if (!rawError) {
      return new RepositoryError({
        message: `${prefix}An unexpected unknown error occurred`,
        code: "UNKNOWN_ERROR",
        statusCode: 500,
      });
    }

    // Check for offline / network timeout
    const errorMessage = String(rawError.message || rawError);
    if (
      errorMessage.includes("Failed to fetch") ||
      errorMessage.includes("Network request failed") ||
      errorMessage.includes("NetworkError") ||
      errorMessage.includes("ধীর") ||
      rawError.code === "ECONNABORTED" ||
      rawError.name === "AbortError"
    ) {
      const isSlow =
        errorMessage.includes("ধীর") ||
        rawError.code === "ECONNABORTED" ||
        rawError.name === "AbortError";

      return new RepositoryError({
        message: isSlow
          ? "নেটওয়ার্ক ধীর, আবার চেষ্টা করবেন?"
          : `${prefix}Network connectivity issue. Please check your internet connection.`,
        code: "NETWORK_ERROR",
        statusCode: 0,
        cause: error,
      });
    }

    // Postgrest / Postgres status and error codes
    const postgrestCode = rawError.code;

    // PGRST116: JSON object requested, multiple (or no) rows returned
    if (postgrestCode === "PGRST116" || rawError.statusCode === 404) {
      return new RepositoryError({
        message: `${prefix}Requested record was not found`,
        code: "NOT_FOUND",
        statusCode: 404,
        details: rawError.details,
        cause: error,
      });
    }

    // 23505: unique_violation
    if (postgrestCode === "23505") {
      return new RepositoryError({
        message: `${prefix}Record with unique attribute already exists`,
        code: "CONFLICT",
        statusCode: 409,
        details: rawError.details,
        cause: error,
      });
    }

    // 23503: foreign_key_violation
    if (postgrestCode === "23503") {
      return new RepositoryError({
        message: `${prefix}Referenced foreign record does not exist`,
        code: "VALIDATION_ERROR",
        statusCode: 422,
        details: rawError.details,
        cause: error,
      });
    }

    // 42P01: undefined_table
    if (postgrestCode === "42P01") {
      return new RepositoryError({
        message: `${prefix}Database table configuration error`,
        code: "DATABASE_ERROR",
        statusCode: 500,
        cause: error,
      });
    }

    // Auth error
    if (rawError.status === 401 || rawError.statusCode === 401 || postgrestCode === "PGRST301") {
      return new RepositoryError({
        message: `${prefix}Authentication required or session expired`,
        code: "UNAUTHORIZED",
        statusCode: 401,
        cause: error,
      });
    }

    if (rawError.status === 403 || rawError.statusCode === 403) {
      return new RepositoryError({
        message: `${prefix}Access forbidden: insufficient permissions`,
        code: "FORBIDDEN",
        statusCode: 403,
        cause: error,
      });
    }

    return new RepositoryError({
      message: `${prefix}${rawError.message || "Database operation failed"}`,
      code: "DATABASE_ERROR",
      statusCode: rawError.status || rawError.statusCode || 500,
      details: rawError.details || rawError.hint,
      cause: error,
    });
  }

  /**
   * Find record by primary key ID
   */
  async findById(id: TId): Promise<T | null> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select(this.defaultSelect)
        .eq("id", id as any)
        .maybeSingle();

      if (error) {
        throw this.normalizeError(error, `findById(${String(id)})`);
      }

      return (data as unknown as T) || null;
    } catch (err) {
      throw this.normalizeError(err, `findById(${String(id)})`);
    }
  }

  /**
   * Find all records with optional filters, pagination, and sorting
   */
  async findAll(filter?: Record<string, any>, options?: QueryOptions): Promise<T[]> {
    try {
      let query = this.client
        .from(this.tableName)
        .select(options?.select || this.defaultSelect);

      if (filter) {
        for (const [key, value] of Object.entries(filter)) {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        }
      }

      if (options?.orderBy) {
        query = query.order(options.orderBy, {
          ascending: options.ascending ?? true,
        });
      }

      if (options?.limit !== undefined) {
        const offset = options.offset || 0;
        query = query.range(offset, offset + options.limit - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw this.normalizeError(error, "findAll");
      }

      return (data as unknown as T[]) || [];
    } catch (err) {
      throw this.normalizeError(err, "findAll");
    }
  }

  /**
   * Create a new record
   */
  async create(data: TCreate): Promise<T> {
    try {
      const { data: created, error } = await this.client
        .from(this.tableName)
        .insert(data as any)
        .select(this.defaultSelect)
        .single();

      if (error) {
        throw this.normalizeError(error, "create");
      }

      return created as unknown as T;
    } catch (err) {
      throw this.normalizeError(err, "create");
    }
  }

  /**
   * Update an existing record by ID
   */
  async update(id: TId, data: TUpdate): Promise<T> {
    try {
      const { data: updated, error } = await this.client
        .from(this.tableName)
        .update({
          ...(data as any),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id as any)
        .select(this.defaultSelect)
        .single();

      if (error) {
        throw this.normalizeError(error, `update(${String(id)})`);
      }

      return updated as unknown as T;
    } catch (err) {
      throw this.normalizeError(err, `update(${String(id)})`);
    }
  }

  /**
   * Delete a record by ID
   */
  async delete(id: TId): Promise<boolean> {
    try {
      const { error } = await this.client
        .from(this.tableName)
        .delete()
        .eq("id", id as any);

      if (error) {
        throw this.normalizeError(error, `delete(${String(id)})`);
      }

      return true;
    } catch (err) {
      throw this.normalizeError(err, `delete(${String(id)})`);
    }
  }

  /**
   * Count records matching filter
   */
  async count(filter?: Record<string, any>): Promise<number> {
    try {
      let query = this.client
        .from(this.tableName)
        .select("*", { count: "exact", head: true });

      if (filter) {
        for (const [key, value] of Object.entries(filter)) {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        }
      }

      const { count, error } = await query;

      if (error) {
        throw this.normalizeError(error, "count");
      }

      return count || 0;
    } catch (err) {
      throw this.normalizeError(err, "count");
    }
  }
}
