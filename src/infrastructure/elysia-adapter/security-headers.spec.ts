/**
 * Spec: CORS headers + wildcard compilation for the Elysia bootstrap.
 *
 * Covers V2 D43 specifically:
 *  - wildcard strings compile to anchored RegExps
 *  - Accept-Mode in the allowed-headers list
 *
 * The Expo-default auto-include in non-production is covered by
 * `@/shared-kernel/http/cors-allowlist.spec.ts` (P1 #11 canonical
 * builder owns that behaviour after the V2 rebase consolidated
 * `buildCorsOriginList` into `buildCorsAllowlist`).
 */

import { describe, expect, it } from 'bun:test';
import { ALLOWED_REQUEST_HEADERS, compileWildcardOrigins } from './security-headers';

describe('ALLOWED_REQUEST_HEADERS', () => {
  it('includes Accept-Mode (V2 D42 mobile)', () => {
    expect(ALLOWED_REQUEST_HEADERS).toContain('Accept-Mode');
  });

  it('keeps the historical web headers', () => {
    expect(ALLOWED_REQUEST_HEADERS).toContain('Content-Type');
    expect(ALLOWED_REQUEST_HEADERS).toContain('Authorization');
    expect(ALLOWED_REQUEST_HEADERS).toContain('X-Request-Id');
  });
});

describe('compileWildcardOrigins', () => {
  it('passes plain string origins through unchanged', () => {
    const compiled = compileWildcardOrigins(['https://patchcareers.com']);
    expect(compiled).toEqual(['https://patchcareers.com']);
  });

  it('converts a wildcard string into an anchored case-insensitive RegExp', () => {
    const [re] = compileWildcardOrigins(['https://*.expo.dev']);
    expect(re).toBeInstanceOf(RegExp);
    expect((re as RegExp).test('https://abc.expo.dev')).toBe(true);
    expect((re as RegExp).test('https://my-project.expo.dev')).toBe(true);
    expect((re as RegExp).test('https://evil.com')).toBe(false);
    // anchored — no suffix-trick.
    expect((re as RegExp).test('https://abc.expo.dev.evil.com')).toBe(false);
  });

  it('compiles `exp://*` for Expo Go redirect URIs', () => {
    const [re] = compileWildcardOrigins(['exp://*']);
    expect(re).toBeInstanceOf(RegExp);
    expect((re as RegExp).test('exp://192.168.1.42:19000')).toBe(true);
    expect((re as RegExp).test('https://exp://attack')).toBe(false);
  });

  it('mixes plain + wildcard entries in a single call', () => {
    const compiled = compileWildcardOrigins([
      'https://patchcareers.com',
      'https://*.expo.dev',
      'http://localhost:8081',
    ]);
    expect(compiled[0]).toBe('https://patchcareers.com');
    expect(compiled[1]).toBeInstanceOf(RegExp);
    expect(compiled[2]).toBe('http://localhost:8081');
  });
});
