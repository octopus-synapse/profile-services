import { z } from 'zod';

/**
 * Strict ISO 8601 date-time (e.g. `2026-05-03T14:00:00Z`).
 *
 * Replaces the inline `z.string().datetime()` calls scattered across 20+
 * route schemas — see Q7 in the duplication audit.
 */
export const IsoDateTimeSchema = z.string().datetime({ offset: true });

export type IsoDateTime = z.infer<typeof IsoDateTimeSchema>;

/**
 * Strict `YYYY-MM-DD` date (no time component).
 *
 * Use when the value semantically is a calendar day (DOB, start/end
 * dates) and the wire format must be unambiguous.
 */
export const DateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)');

export type DateOnly = z.infer<typeof DateOnlySchema>;
