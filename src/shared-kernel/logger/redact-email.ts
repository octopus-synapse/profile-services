/**
 * PII-safe email redaction for log output.
 *
 *   `john.doe@example.com` → `j***@example.com`
 *   `j@e.com`              → `j***@e.com`
 *   `''` / `undefined`     → `'<empty>'`
 *   Malformed (no `@`)     → `'<redacted>'`
 *
 * Use whenever a log entry would otherwise carry a raw email address.
 * The local-part first character is preserved so devs can correlate
 * across log lines without leaking the full address. Domain stays
 * intact for routing diagnostics.
 *
 * Enforced by `scripts/lint-pii-in-logs.ts`: log calls referencing
 * `*.email` (without `redactEmail` wrap) fail CI.
 */
export function redactEmail(email: string | undefined | null): string {
  if (!email) return '<empty>';
  const at = email.indexOf('@');
  if (at < 1) return '<redacted>';
  return `${email[0]}***${email.slice(at)}`;
}
