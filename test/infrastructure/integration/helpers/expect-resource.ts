/**
 * `expectResource(res, schema)` — Zod-backed shape assertion for
 * integration tests.
 *
 * Background: a wave of integration specs predates the Q18 sweep that
 * stripped the `{data: ...}` envelope from successful 2xx responses.
 * Those specs assert `res.body.toHaveProperty('data')` and stop —
 * meaning a route that drifts (e.g. starts returning {sections, total}
 * instead of [{id,...}]) passes silently as long as something is in
 * the body.
 *
 * This helper replaces the bare envelope check with a strict shape
 * validation: pass the Zod schema the route advertises and the
 * helper either returns the parsed payload (typed) or fails loudly
 * with the Zod issue path.
 *
 * Usage:
 *   const body = expectResource(res, ResumeSectionsListResponseSchema);
 *   //  ^? { sections: GenericResumeSection[] }
 *   expect(body.sections.length).toBeGreaterThan(0);
 */

import { expect } from 'bun:test';
import type { z } from 'zod';

interface ResponseLike {
  status: number;
  body: unknown;
}

export function expectResource<TSchema extends z.ZodTypeAny>(
  res: ResponseLike,
  schema: TSchema,
  options: { expectedStatus?: number | readonly number[] } = {},
): z.infer<TSchema> {
  const expectedStatus = options.expectedStatus;
  if (expectedStatus !== undefined) {
    const expected = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
    expect(
      expected,
      `expected status ${expected.join('|')} but got ${res.status} (body: ${JSON.stringify(res.body)})`,
    ).toContain(res.status);
  } else {
    // No explicit expectation: tolerate the 2xx range. The spec is
    // already asserting on the body shape — we don't want to silently
    // accept a 500 that happens to ship a parseable Zod payload.
    expect(
      res.status,
      `expected 2xx but got ${res.status} (body: ${JSON.stringify(res.body)})`,
    ).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
  }

  const result = schema.safeParse(res.body);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('\n');
    throw new Error(
      `Response body does not match schema:\n${issues}\n\nActual body: ${JSON.stringify(
        res.body,
        null,
        2,
      )}`,
    );
  }
  return result.data;
}
