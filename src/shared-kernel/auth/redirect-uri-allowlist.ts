/**
 * Redirect URI allowlist for OAuth start endpoints.
 *
 * V2 mobile clients pass an explicit `redirect_uri` query param to
 * `/v1/auth/oauth/{provider}/start` so the callback knows where to
 * forward tokens (web flow keeps the cookie + UI redirect default).
 *
 * Each allowlist entry is a pattern with `*` wildcards:
 *
 *   patchcareers://*                    — Expo / native deep link
 *   https://patchcareers.com/*          — production web
 *   http://localhost:8081/*             — Expo dev server
 *
 * `*` matches any sequence of one or more characters (including `/`).
 * The literal prefix the operator writes — including the trailing
 * `/` before `*` — is what fences out host-confusion attacks like
 * `https://patchcareers.com.evil.com/oauth`. The comparison is
 * case-insensitive (URIs are case-insensitive on scheme/host).
 *
 * Decisions: D41 (V2). The default mode (no `redirect_uri`) preserves
 * the existing cookie-based web flow — this allowlist only governs the
 * opt-in dynamic-redirect path.
 */

/**
 * Returns true when `candidate` matches one of the comma- or
 * array-separated `patterns`. Patterns may contain `*` wildcards.
 *
 * Wildcard semantics:
 * - `*` matches one or more characters (including `/`).
 * - Anything else is matched literally (regex-escaped).
 *
 * The match is anchored end-to-end — no implicit prefix/suffix wildcard.
 *
 * @example
 *   isRedirectUriAllowed('patchcareers://auth/cb', ['patchcareers://*'])
 *     => true
 *   isRedirectUriAllowed('https://evil.com/cb', ['https://patchcareers.com/*'])
 *     => false
 */
export function isRedirectUriAllowed(
  candidate: string,
  patterns: readonly string[] | string,
): boolean {
  if (!candidate) return false;
  const list = typeof patterns === 'string' ? parseAllowlist(patterns) : patterns;
  if (list.length === 0) return false;
  for (const pattern of list) {
    if (matchesPattern(candidate, pattern)) return true;
  }
  return false;
}

/**
 * Parses a CSV (env var) into an array of trimmed, non-empty pattern strings.
 */
export function parseAllowlist(csv: string): readonly string[] {
  if (!csv) return [];
  return csv
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function matchesPattern(candidate: string, pattern: string): boolean {
  const re = patternToRegExp(pattern);
  return re.test(candidate);
}

function patternToRegExp(pattern: string): RegExp {
  // Escape regex metacharacters, then turn `\*` (escaped) back into
  // `.+` so a wildcard matches the remainder of the URI (path /
  // query / fragment). The literal prefix the operator writes —
  // including the trailing `/` before `*` — is what fences out
  // host-confusion attacks like `https://patchcareers.com.evil.com/*`.
  // Anchored end-to-end so an attacker can't append a fragment that
  // bypasses the suffix.
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.+');
  return new RegExp(`^${escaped}$`, 'i');
}
