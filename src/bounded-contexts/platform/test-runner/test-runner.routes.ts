/**
 * Route descriptors for the test-runner BC. Replaces
 * `TestRunnerController`.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { TestRunnerUseCases } from './application/ports/test-runner.port';

const RunTestsBody = z.object({ suite: z.string() });

export const testRunnerRoutes: ReadonlyArray<Route<TestRunnerUseCases>> = [
  {
    method: 'POST',
    path: '/v1/admin/test/run',
    auth: { kind: 'jwt' },
    permission: Permission.ADMIN_FULL_ACCESS,
    body: RunTestsBody,
    openapi: {
      summary: 'Run a test suite',
      tags: ['Admin - Test Runner'],
    },
    handler: async (ctx, bc) => {
      const { suite } = ctx.body as { suite: string };
      const results = await bc.runTestSuite.execute(suite);
      return { success: true, data: results as unknown as Record<string, unknown> };
    },
  },
  {
    method: 'GET',
    path: '/v1/admin/test/suites',
    auth: { kind: 'jwt' },
    permission: Permission.ADMIN_FULL_ACCESS,
    openapi: {
      summary: 'List available test suites',
      tags: ['Admin - Test Runner'],
    },
    handler: async (_ctx, bc) => {
      return {
        success: true,
        data: { suites: bc.listTestSuites.execute() },
      };
    },
  },
];
