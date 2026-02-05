/**
 * HTTP Client Types
 *
 * Infrastructure types for HTTP clients used by frontend applications.
 * These are transport-layer concerns, not domain types.
 */

import { z } from "zod";

// ============================================================================
// Retry Configuration
// ============================================================================

export const RetryConfigSchema = z.object({
 retries: z.number().int().min(0).max(10),
 delay: z.number().int().min(0).max(60000),
});

export interface RetryConfig {
 retries: number;
 delay: number;
 shouldRetry: (error: unknown) => boolean;
}

// ============================================================================
// HTTP Client Configuration
// ============================================================================

export interface HttpClientConfig {
 baseURL: string;
 timeout?: number;
 getToken?: () => string | null | Promise<string | null>;
 refreshToken?: () => Promise<string | null>;
 onUnauthorized?: () => void;
 headers?: Record<string, string>;
 getCsrfToken?: () => string | null | Promise<string | null>;
 csrfHeaderName?: string;
}

// ============================================================================
// HTTP Client Interface
// ============================================================================

export interface HttpClient {
 get<T>(url: string, config?: unknown): Promise<T>;
 post<T>(url: string, data?: unknown, config?: unknown): Promise<T>;
 put<T>(url: string, data?: unknown, config?: unknown): Promise<T>;
 patch<T>(url: string, data?: unknown, config?: unknown): Promise<T>;
 delete<T = void>(url: string, config?: unknown): Promise<T>;
 /**
  * Raw HTTP client instance (axios in web, fetch adapter in mobile).
  * Use with caution - prefer typed methods above.
  */
 instance: unknown;
}

// ============================================================================
// Transport Errors (Client-side only)
// ============================================================================

export const TransportErrorCodeSchema = z.enum(["NETWORK_ERROR", "TIMEOUT"]);
export type TransportErrorCode = z.infer<typeof TransportErrorCodeSchema>;

export const TransportErrorSchema = z.object({
 code: TransportErrorCodeSchema,
 message: z.string(),
 statusCode: z.literal(0),
 details: z.record(z.unknown()).optional(),
 timestamp: z.string().datetime(),
});

export type TransportError = z.infer<typeof TransportErrorSchema>;

// ============================================================================
// API Error (Domain errors from backend)
// ============================================================================

export interface ApiError {
 code: string;
 message: string;
 statusCode: number;
 details?: Record<string, unknown>;
 timestamp: string;
}

export interface HttpValidationError extends ApiError {
 code: "VALIDATION_ERROR";
 fieldErrors: Record<string, string[]>;
}

export type AnyApiError = ApiError | TransportError;
