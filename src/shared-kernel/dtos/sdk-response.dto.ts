/**
 * SDK Response DTOs — Backward Compatibility Re-export
 *
 * DESIGN DECISION: DTOs split into domain-specific files under ./sdk-response/.
 * This file re-exports everything so existing imports remain valid.
 *
 * Prefer importing from '@/shared-kernel/dtos/sdk-response' or specific sub-files.
 */

export * from './sdk-response/index';
