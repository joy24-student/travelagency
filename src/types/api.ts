import { z } from "zod";

/**
 * Standardized API Contracts and Envelope - Shopno Jatra
 * Provides uniform type safety and runtime validation for all API interactions.
 */

// ============================================================================
// 1. API ERROR DEFINITION
// ============================================================================

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  status: z.number().int().default(500),
  details: z.unknown().optional(),
  validationErrors: z.record(z.string(), z.array(z.string())).optional(),
  timestamp: z.string().datetime().default(() => new Date().toISOString()),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

// ============================================================================
// 2. METADATA DEFINITION
// ============================================================================

export const apiResponseMetaSchema = z
  .object({
    requestId: z.string().optional(),
    serverTime: z.string().datetime().optional(),
    cached: z.boolean().optional(),
    version: z.string().optional(),
  })
  .optional();
export type ApiResponseMeta = z.infer<typeof apiResponseMetaSchema>;

// ============================================================================
// 3. API RESPONSE ENVELOPE (DISCRIMINATED UNION)
// ============================================================================

export type ApiResponse<T> =
  | {
      data: T;
      error: null;
      meta?: ApiResponseMeta;
    }
  | {
      data: null;
      error: ApiError;
      meta?: ApiResponseMeta;
    };

/**
 * Runtime schema builder for generic ApiResponse<T> envelopes
 */
export function createApiResponseSchema<T>(dataSchema: z.ZodType<T>) {
  return z.discriminatedUnion("data", [
    z.object({
      data: dataSchema,
      error: z.null(),
      meta: apiResponseMetaSchema,
    }),
    z.object({
      data: z.null(),
      error: apiErrorSchema,
      meta: apiResponseMetaSchema,
    }),
  ]);
}

// ============================================================================
// 4. PAGINATED RESPONSE ENVELOPE
// ============================================================================

export const paginationMetaSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
});
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

export function createPaginatedResponseSchema<T>(itemSchema: z.ZodType<T>) {
  return z.object({
    items: z.array(itemSchema),
    pagination: paginationMetaSchema,
  });
}

// ============================================================================
// 5. CONVENIENCE BUILDERS
// ============================================================================

export function createSuccessResponse<T>(
  data: T,
  meta?: ApiResponseMeta
): ApiResponse<T> {
  return {
    data,
    error: null,
    meta: {
      serverTime: new Date().toISOString(),
      ...meta,
    },
  };
}

export function createErrorResponse(
  errorOrMessage: ApiError | string,
  code: string = "INTERNAL_ERROR",
  status: number = 500,
  details?: unknown
): ApiResponse<never> {
  if (typeof errorOrMessage === "string") {
    return {
      data: null,
      error: {
        code,
        message: errorOrMessage,
        status,
        details,
        timestamp: new Date().toISOString(),
      },
    };
  }

  return {
    data: null,
    error: errorOrMessage,
  };
}
