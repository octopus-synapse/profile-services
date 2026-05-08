import { beforeAll, describe, expect, it } from 'bun:test';
import { resolve } from 'node:path';
import type { ZodSchema } from 'zod';
import type { OperationMetadata, SwaggerInfo } from '../engine';
import {
  analyzeDrift,
  buildQueryString,
  extractParamsExample,
  extractQueryExample,
  fillPathParams,
  isHappyPathProbable,
  loadRoutes,
  loadSwaggerInfo,
  pickPersona,
  probe,
  SessionPool,
} from '../engine';

const BASE_URL = process.env.DRIFT_BASE_URL;
const SRC_DIR = resolve(import.meta.dir, '../../../../src');
const SWAGGER_PATH = resolve(import.meta.dir, '../../../../swagger.json');
const SKIP_GUARDS = new Set(['internal-auth']);

const routes = BASE_URL ? await loadRoutes(SRC_DIR) : [];
const probable = routes.filter((r) => isHappyPathProbable(r.route));
const swaggerInfo: SwaggerInfo = BASE_URL
  ? loadSwaggerInfo(SWAGGER_PATH)
  : {
      operationMetadata: new Map<string, OperationMetadata>(),
      adminPermissions: new Set<string>(),
    };

describe('Contract — GET 200: response matches Zod schema', () => {
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

    it(`GET ${route.path}`, async () => {
      const paramsExample = extractParamsExample(route.params) as Record<string, unknown> | null;
      const queryExample = extractQueryExample(route.query);
      const url = `${BASE_URL}/api${fillPathParams(route.path, paramsExample ?? undefined)}${buildQueryString(queryExample)}`;
      const outcome = await probe({ method: 'GET', url, token: pool.tokenFor(persona) });

      expect(outcome.error).toBeUndefined();
      expect(outcome.status).toBeGreaterThanOrEqual(200);
      expect(outcome.status).toBeLessThan(300);

      if (outcome.status === 200 && route.response && outcome.body !== null) {
        const drifts = analyzeDrift(route.response as ZodSchema<unknown>, outcome.body);
        expect(drifts).toEqual([]);
      }
    });
  }
});
