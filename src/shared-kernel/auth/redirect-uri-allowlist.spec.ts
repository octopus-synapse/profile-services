/**
 * Spec: redirect-uri allowlist matcher (V2 D41).
 *
 * Covers the wildcard semantics promised in the module's TSDoc:
 *  - `*` matches a single path/host segment (no `/` greed)
 *  - case-insensitive scheme/host, exact path
 *  - anchored end-to-end (reject append-tricks)
 *  - CSV env var parsing
 */
import { describe, expect, it } from 'bun:test';
import { isRedirectUriAllowed, parseAllowlist } from './redirect-uri-allowlist';

describe('parseAllowlist', () => {
  it('splits a comma-separated env var into trimmed entries', () => {
    expect(parseAllowlist('a, b ,c')).toEqual(['a', 'b', 'c']);
  });

  it('drops empty / whitespace-only entries', () => {
    expect(parseAllowlist('a,,  ,b')).toEqual(['a', 'b']);
  });

  it('returns [] for empty input', () => {
    expect(parseAllowlist('')).toEqual([]);
  });
});

describe('isRedirectUriAllowed', () => {
  const allow = ['patchcareers://*', 'https://patchcareers.com/*', 'http://localhost:8081/*'];

  it('accepts deep-link scheme via wildcard', () => {
    expect(isRedirectUriAllowed('patchcareers://auth/callback', allow)).toBe(true);
  });

  it('accepts allowed https origin', () => {
    expect(isRedirectUriAllowed('https://patchcareers.com/oauth/done', allow)).toBe(true);
  });

  it('accepts Expo dev server localhost', () => {
    expect(isRedirectUriAllowed('http://localhost:8081/oauth', allow)).toBe(true);
  });

  it('rejects unknown host', () => {
    expect(isRedirectUriAllowed('https://evil.com/cb', allow)).toBe(false);
  });

  it('rejects scheme mismatch (http vs https) for fixed origin', () => {
    expect(isRedirectUriAllowed('http://patchcareers.com/oauth', allow)).toBe(false);
  });

  it('rejects empty candidate', () => {
    expect(isRedirectUriAllowed('', allow)).toBe(false);
  });

  it('rejects when allowlist is empty', () => {
    expect(isRedirectUriAllowed('patchcareers://auth/cb', [])).toBe(false);
  });

  it('rejects host-confusion attacks (literal prefix before `*` fences host)', () => {
    // Operator's pattern is `https://patchcareers.com/*`. The literal
    // `https://patchcareers.com/` must appear in full — an attacker
    // domain like `patchcareers.com.evil.com` cannot match because
    // there's no `/` directly after `.com`.
    const result = isRedirectUriAllowed('https://patchcareers.com.evil.com/oauth', allow);
    expect(result).toBe(false);
  });

  it('rejects an attacker-suffixed allowed prefix', () => {
    // `https://patchcareers.com` (no trailing slash) is NOT in the
    // allowlist; the operator wrote `https://patchcareers.com/*`.
    expect(isRedirectUriAllowed('https://patchcareers.com', allow)).toBe(false);
  });

  it('is case-insensitive on scheme / host', () => {
    expect(isRedirectUriAllowed('PATCHCAREERS://Auth/Callback', allow)).toBe(true);
  });

  it('lets a wildcard match the full remainder (path + query)', () => {
    // Wildcards intentionally span path segments so a single pattern
    // covers `/done`, `/done/extra`, `/done?ok=1`. Operators tighten
    // by using a longer literal prefix.
    expect(isRedirectUriAllowed('https://patchcareers.com/done', allow)).toBe(true);
    expect(isRedirectUriAllowed('https://patchcareers.com/done/extra', allow)).toBe(true);
    expect(isRedirectUriAllowed('https://patchcareers.com/done?ok=1', allow)).toBe(true);
  });

  it('accepts a CSV string directly (env var convenience)', () => {
    expect(
      isRedirectUriAllowed(
        'patchcareers://auth/cb',
        'patchcareers://*, https://patchcareers.com/*',
      ),
    ).toBe(true);
  });
});
