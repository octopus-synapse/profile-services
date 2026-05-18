/**
 * PII-safe email redaction for log output.
 *
 *   `john.doe@example.com` → `j***@example.com`
 *   `ab@example.com`       → `***@example.com` (short local-part — P2-#8)
 *   `j@e.com`              → `***@e.com`       (short local-part — P2-#8)
 *   `''` / `undefined`     → `'<empty>'`
 *   Malformed (no `@`)     → `'<redacted>'`
 *
 * Use whenever a log entry would otherwise carry a raw email address.
 * For local-parts of 3+ chars the first character is preserved so devs
 * can correlate across log lines without leaking the full address. For
 * 1-2 char local-parts we drop that hint entirely (BUG_REPORT P2-#8:
 * `j` *is* the whole local-part, so the previous form leaked 100%).
 * Domain stays intact for routing diagnostics.
 *
 * Enforced by `scripts/lint-pii-in-logs.ts`: log calls referencing
 * `*.email` (without `redactEmail` wrap) fail CI.
 */
export function redactEmail(email: string | undefined | null): string {
  if (!email) return '<empty>';
  const at = email.indexOf('@');
  if (at < 1) return '<redacted>';
  if (at <= 2) return `***${email.slice(at)}`;
  return `${email[0]}***${email.slice(at)}`;
}
