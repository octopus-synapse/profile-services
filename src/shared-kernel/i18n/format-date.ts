/**
 * P2-112 — single helper for the "Mon YYYY" date format used in resume
 * exports (LaTeX + DOCX). Locale defaults to `'en'`; callers should
 * pass the resume's `primaryLanguage` once that's plumbed through to
 * the export pipeline. Until then `'en'` keeps the current shipping
 * behavior intact (was `'en-US'`, which is identical for short month).
 *
 * Returns an empty string for null / NaN inputs so callers don't have
 * to guard each call site.
 */
export function formatMonthYear(date: Date | string | null | undefined, locale = 'en'): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  const month = d.toLocaleString(locale, { month: 'short' });
  return `${month} ${d.getFullYear()}`;
}
