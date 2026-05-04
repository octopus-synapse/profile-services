/**
 * Date Utilities
 * Robust UTC date parsing with validation.
 *
 * Format validation is delegated to the canonical `DateOnlySchema` in
 * shared-kernel/schemas/primitives/datetime.schema.ts (Q40 + Q7 in the
 * duplication audit).
 */

import { DateOnlySchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

/**
 * Converts a date string to UTC Date with validation.
 * @param value Date string in YYYY-MM-DD format
 * @returns Date object in UTC or null if invalid
 */
export function toUTCDate(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null;

  const parsed = DateOnlySchema.safeParse(value);
  if (!parsed.success) return null;

  const [year, month, day] = parsed.data.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  // Guard against calendar overflow (e.g. 2023-02-30 parses but rolls over).
  if (Number.isNaN(date.getTime())) return null;

  return date;
}

/**
 * Checks if a date string is valid.
 */
export function isValidDateString(value: string): boolean {
  return toUTCDate(value) !== null;
}
