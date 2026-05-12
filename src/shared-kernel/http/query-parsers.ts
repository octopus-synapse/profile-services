/**
 * Query parameter parsers for HTTP routes.
 *
 * The canonical place for parsing offset/limit/page query strings.
 * Replaces the seven divergent local helpers (parsePositiveInt,
 * parseLimitOrThrow, parseLimitLoose, parseLimit, clampLimit,
 * parsePage, num) catalogued in Q2 of the duplication audit.
 *
 * For full pagination route inputs prefer the canonical Zod schema:
 * `import { PaginationQuerySchema } from '@/shared-kernel/schemas/common/api.types'`.
 *
 * Use these helpers only for one-off parameters that aren't part of a
 * pagination object (e.g. `?limit=` on search endpoints, `?cursor=`
 * pagination where only `limit` is offset-style).
 */

/**
 * Parse a positive integer query parameter with a fallback.
 *
 * - Returns `fallback` if the value is `undefined`/`null`/empty.
 * - Returns `fallback` if the value is not a finite positive number.
 * - Optionally clamps to `[1, max]` when `max` is provided.
 */
export function parsePositiveIntParam(
  value: string | number | undefined | null,
  fallback: number,
  max?: number,
): number {
  if (value === undefined || value === null || value === '') return fallback;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return max !== undefined ? Math.min(n, max) : n;
}
