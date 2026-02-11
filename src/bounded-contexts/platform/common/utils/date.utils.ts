/**
 * Date Utilities
 * Robust UTC date parsing with validation
 */

/**
 * Converts a date string to UTC Date with validation
 * @param value Date string in YYYY-MM-DD format
 * @returns Date object in UTC or null if invalid
 */
export function toUTCDate(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null;

  // Strict YYYY-MM-DD validation
  const dateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) {
    return null; // Fail gracefully
  }

  const [, year, month, day] = dateMatch;
  const date = new Date(Date.UTC(+year, +month - 1, +day));

  // Validate the date is actually valid (no overflow like 2023-13-40)
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/**
 * Checks if a date string is valid
 */
export function isValidDateString(value: string): boolean {
  return toUTCDate(value) !== null;
}
