/**
 * Phone display formatting for rendered artifacts (resume HTML preview + Typst
 * PDF). Stored numbers are canonical E.164 (`+5511978833101`); for display we
 * want the country-aware, readable international form (`+55 11 97883-3101`).
 *
 * Uses `libphonenumber-js` — the same library the frontend's phone-mask uses —
 * so the formatting stays consistent across the app and the exported document.
 * Imports the `/max` metadata so national grouping is exact (e.g. the BR mobile
 * hyphen `97883-3101`); bundle size is irrelevant on the server.
 */
import { parsePhoneNumberFromString } from 'libphonenumber-js/max';

/**
 * Format a phone number for display in the country-aware form, mirroring the
 * app's own phone-mask (`+{callingCode} {nationalGrouping}`, e.g.
 * `+55 (11) 97883-3101`) so the resume matches what users see elsewhere — as
 * opposed to `formatInternational()`, which drops the national grouping (BR →
 * `+55 11 97883 3101`).
 *
 * Falls back to the raw input on anything that doesn't parse cleanly (legacy
 * non-E.164 values, partials) so rendering never breaks — a slightly ugly
 * phone is better than a thrown error in the export pipeline.
 */
export function formatPhoneForDisplay(phone: string | null | undefined): string | null {
  const raw = phone?.trim();
  if (!raw) return null;
  // `parsePhoneNumberFromString` returns `undefined` (never throws) on
  // anything that doesn't parse cleanly — legacy non-E.164 values,
  // partials — so we fall back to the raw input without a swallow.
  const parsed = parsePhoneNumberFromString(raw);
  return parsed ? `+${parsed.countryCallingCode} ${parsed.formatNational()}` : raw;
}
