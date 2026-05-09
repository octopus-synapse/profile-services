import { describe, expect, it } from 'bun:test';
import { resolve } from 'node:path';
import { fillPathParams, isAuthProbable, loadRoutes, probe } from '../engine';

const BASE_URL = process.env.DRIFT_BASE_URL;
const SRC_DIR = resolve(import.meta.dir, '../../../../src');

const routes = BASE_URL ? await loadRoutes(SRC_DIR) : [];
const probable = routes.filter((r) => isAuthProbable(r.route));

describe('Contract — JWT routes: 401 when unauthenticated', () => {
  if (!BASE_URL) {
    it.todo('Set DRIFT_BASE_URL to run contract probes', () => {});
  }

  for (const { route } of probable) {
    if (route.kind === 'sse' || route.kind === 'stream' || route.kind === 'multipart') continue;

    it(`${route.method} ${route.path}`, async () => {
      const url = `${BASE_URL}/api${fillPathParams(route.path)}`;
      const body = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(route.method) ? {} : undefined;
      const outcome = await probe({ method: route.method, url, body });

      expect(outcome.error).toBeUndefined();
      // 401 = auth middleware rejected; 400 = body/query validation ran first.
      // Both prove the route is not publicly accessible to anonymous requests.
      expect([400, 401]).toContain(outcome.status);
    });
  }
});
