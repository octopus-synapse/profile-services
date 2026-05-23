/**
 * Spec: `readAcceptMode` header parser. Mobile clients send
 * `Accept-Mode: tokens`; everything else is treated as the legacy
 * cookie flow.
 */

import { describe, expect, it } from 'bun:test';
import type { HttpCtx } from '@/shared-kernel/http/context';
import { readAcceptMode } from './accept-mode';

function makeCtx(headers: Record<string, string | string[] | undefined>): HttpCtx {
  return {
    method: 'POST',
    path: '/',
    headers,
    cookies: {},
    ip: undefined,
    userAgent: undefined,
    body: undefined,
    query: {},
    params: {},
    user: null,
    state: {},
  };
}

describe('readAcceptMode', () => {
  it("returns 'cookie' when header is absent", () => {
    expect(readAcceptMode(makeCtx({}))).toBe('cookie');
  });

  it("returns 'tokens' for exact 'tokens' value", () => {
    expect(readAcceptMode(makeCtx({ 'accept-mode': 'tokens' }))).toBe('tokens');
  });

  it("returns 'tokens' for mixed-case 'Tokens'", () => {
    expect(readAcceptMode(makeCtx({ 'accept-mode': 'Tokens' }))).toBe('tokens');
  });

  it("treats unknown values as 'cookie'", () => {
    expect(readAcceptMode(makeCtx({ 'accept-mode': 'session' }))).toBe('cookie');
  });

  it("returns 'cookie' for explicit 'cookie' value", () => {
    expect(readAcceptMode(makeCtx({ 'accept-mode': 'cookie' }))).toBe('cookie');
  });

  it('handles array header values (picks first)', () => {
    expect(readAcceptMode(makeCtx({ 'accept-mode': ['tokens', 'cookie'] }))).toBe('tokens');
  });
});
