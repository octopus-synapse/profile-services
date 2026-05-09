import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import type { Route } from '@/shared-kernel/http/route';
import { isHappyPathProbable } from './route-loader';

function makeRoute(overrides: Partial<Route> = {}): Route {
  return {
    method: 'GET',
    path: '/v1/fixture',
    auth: { kind: 'public' },
    response: z.object({}),
    openapi: { summary: '', tags: [], description: '' },
    handler: async () => ({}),
    ...overrides,
  } as Route;
}

describe('isHappyPathProbable', () => {
  test('accepts a plain GET with a response schema', () => {
    expect(isHappyPathProbable(makeRoute())).toBe(true);
  });

  test('rejects non-GET methods', () => {
    expect(isHappyPathProbable(makeRoute({ method: 'POST' }))).toBe(false);
    expect(isHappyPathProbable(makeRoute({ method: 'DELETE' }))).toBe(false);
  });

  test('rejects sse and stream route kinds', () => {
    expect(isHappyPathProbable(makeRoute({ kind: 'sse' }))).toBe(false);
    expect(isHappyPathProbable(makeRoute({ kind: 'stream' }))).toBe(false);
  });

  test('rejects routes without a declared response schema', () => {
    expect(isHappyPathProbable(makeRoute({ response: undefined }))).toBe(false);
  });
});
