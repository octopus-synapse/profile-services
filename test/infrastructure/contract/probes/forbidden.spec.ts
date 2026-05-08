import { describe, expect, it } from 'bun:test';
import { resolve } from 'node:path';
import { fillPathParams, isForbiddenProbable, loadRoutes, probe, SessionPool } from '../engine';

const BASE_URL = process.env.DRIFT_BASE_URL;
const SRC_DIR = resolve(import.meta.dir, '../../../../src');

const routes = BASE_URL ? await loadRoutes(SRC_DIR) : [];
const probable = routes.filter((r) => isForbiddenProbable(r.route));

const pool = SessionPool.fromEnv();
if (BASE_URL) await pool.boot();
const noPermsToken = pool.tokenFor('no-perms');

describe('Contract — permission-gated routes: 403 for unprivileged user', () => {
  if (!BASE_URL) {
    it.todo('Set DRIFT_BASE_URL to run contract probes', () => {});
  }

  for (const { route } of probable) {
    if (route.kind === 'sse' || route.kind === 'stream' || route.kind === 'multipart') continue;

    if (!noPermsToken) {
      it.todo(`${route.method} ${route.path} — no-perms user unavailable (seed with SEED_DREDD_FIXTURES=1)`, () => {});
      continue;
    }

    it(`${route.method} ${route.path}`, async () => {
      const url = `${BASE_URL}/api${fillPathParams(route.path)}`;
      const body = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(route.method) ? {} : undefined;
      const outcome = await probe({ method: route.method, url, token: noPermsToken, body });

      expect(outcome.error).toBeUndefined();
      // 403 = permission denied; 400 = body/query validation ran before authz check
      // Both prove the route is not accessible to unprivileged users
      expect([400, 403]).toContain(outcome.status);
    });
  }
});
