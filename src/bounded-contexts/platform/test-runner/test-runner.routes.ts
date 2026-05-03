/**
 * Route descriptors for the test-runner BC. Replaces
 * `TestRunnerController`.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import { TestRunnerUseCases } from './application/ports/test-runner.port';

const RunTestsBody = z.object({ suite: z.string() });

// ─── Response schemas ────────────────────────────────────────────────
const TestResultSchema = z.object({
  name: z.string(),
  pass: z.boolean(),
  detail: z.string(),
  durationMs: z.number(),
});

const TestResultsResponseSchema = z.object({
  suite: z.string(),
  results: z.array(TestResultSchema),
  totalMs: z.number(),
  passed: z.number().int(),
  failed: z.number().int(),
});

const ListSuitesResponseSchema = z.object({
  suites: z.array(z.string()),
});

export const testRunnerRoutes: ReadonlyArray<Route<TestRunnerUseCases>> = [
  {
    method: 'POST',
    path: '/v1/admin/test/run',
    auth: { kind: 'jwt' },
    permission: Permission.ADMIN_FULL_ACCESS,
    body: RunTestsBody,
    response: TestResultsResponseSchema,
    openapi: {
      summary: 'Run a test suite',
      tags: ['admin-test-runner'],
    },
    handler: async (ctx, bc) => {
      const { suite } = ctx.body as { suite: string };
      const results = await bc.runTestSuite.execute(suite);
      return results;
    },
  },
  {
    method: 'GET',
    path: '/v1/admin/test/suites',
    auth: { kind: 'jwt' },
    permission: Permission.ADMIN_FULL_ACCESS,
    response: ListSuitesResponseSchema,
    openapi: {
      summary: 'List available test suites',
      tags: ['admin-test-runner'],
    },
    handler: async (_ctx, bc) => {
      return { suites: bc.listTestSuites.execute() };
    },
  },
];
