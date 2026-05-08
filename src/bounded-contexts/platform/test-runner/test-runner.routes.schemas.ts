/**
 * Route descriptors for the test-runner BC. Replaces
 * `TestRunnerController`.
 */

import { z } from 'zod';

export const RunTestsBody = z.object({ suite: z.string() }).openapi({
  example: {
    suite: 'smoke',
  },
});

// ─── Response schemas ────────────────────────────────────────────────
export const TestResultSchema = z.object({
  name: z.string(),
  pass: z.boolean(),
  detail: z.string(),
  durationMs: z.number(),
});

export const TestResultsResponseSchema = z.object({
  suite: z.string(),
  results: z.array(TestResultSchema),
  totalMs: z.number(),
  passed: z.number().int(),
  failed: z.number().int(),
});

export const ListSuitesResponseSchema = z.object({
  suites: z.array(z.string()),
});
