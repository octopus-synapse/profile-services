import { beforeAll, describe, expect, it } from 'bun:test';
import { resolve } from 'node:path';
import type { OperationMetadata, SwaggerInfo } from '../engine';
import {
  buildQueryString,
  extractBodyExample,
  extractParamsExample,
  extractQueryExample,
  fillPathParams,
  isMutationProbable,
  loadRoutes,
  loadSwaggerInfo,
  pickPersona,
  probe,
  SessionPool,
} from '../engine';

const BASE_URL = process.env.DRIFT_BASE_URL;
const SRC_DIR = resolve(import.meta.dir, '../../../../src');
const SWAGGER_PATH = resolve(import.meta.dir, '../../../../swagger.json');
const SKIP_GUARDS = new Set(['internal-auth', 'external-api', 'multi-step-flow']);

const DEFAULT_SUCCESS_STATUS: Record<string, number> = { POST: 201, PUT: 200, PATCH: 200 };

const routes = BASE_URL ? await loadRoutes(SRC_DIR) : [];
const probable = routes.filter((r) => isMutationProbable(r.route));
const swaggerInfo: SwaggerInfo = BASE_URL
  ? loadSwaggerInfo(SWAGGER_PATH)
  : {
      operationMetadata: new Map<string, OperationMetadata>(),
      adminPermissions: new Set<string>(),
    };

describe('Contract — POST/PUT/PATCH: valid body returns success status', () => {
  let pool: SessionPool;

  beforeAll(async () => {
    pool = SessionPool.fromEnv();
    if (BASE_URL) await pool.boot();
  });

  if (!BASE_URL) {
    it.todo('Set DRIFT_BASE_URL to run contract probes', () => {});
  }

  for (const { route } of probable) {
    const { persona, meta } = pickPersona(route.method, route.path, swaggerInfo);
    if (meta?.guards?.some((g: string) => SKIP_GUARDS.has(g))) continue;

    const bodyExample = extractBodyExample(route.body);
    const expectedStatus = route.statusCode ?? DEFAULT_SUCCESS_STATUS[route.method] ?? 200;

    it(`${route.method} ${route.path}`, async () => {
      if (bodyExample === null) {
        throw new Error(
          `route.body for ${route.method} ${route.path} has no .openapi({ example }) — add one or the lint script will catch it`,
        );
      }

      const paramsExample = extractParamsExample(route.params) as Record<string, unknown> | null;
      const queryExample = extractQueryExample(route.query);
      const url = `${BASE_URL}/api${fillPathParams(route.path, paramsExample ?? undefined)}${buildQueryString(queryExample)}`;
      const outcome = await probe({
        method: route.method,
        url,
        token: pool.tokenFor(persona),
        body: bodyExample,
      });

      expect(outcome.error).toBeUndefined();
      expect([expectedStatus, 409]).toContain(outcome.status);
    });
  }
});
