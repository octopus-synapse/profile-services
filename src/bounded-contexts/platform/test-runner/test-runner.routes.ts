/**
 * Route descriptors for the test-runner BC. Replaces
 * `TestRunnerController`.
 */

import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import { TestRunnerUseCases } from './application/ports/test-runner.port';
import {
  ListSuitesResponseSchema,
  RunTestsBody,
  TestResultsResponseSchema,
} from './test-runner.routes.schemas';

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
