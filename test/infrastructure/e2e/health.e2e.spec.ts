/**
 * Health BC end-to-end smoke. Boots the full Elysia bootstrap and
 * hits the three health endpoints. Other journey suites under
 * `test/infrastructure/_legacy/e2e/` are still on the supertest +
 * AppModule pattern and need to be migrated one-by-one to the new
 * `TestApp` harness.
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { startTestApp, stopTestApp, type TestApp } from '../shared';

describe('Health endpoints (e2e)', () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await startTestApp();
  });
  afterAll(async () => {
    await stopTestApp();
  });

  it('GET /api/health returns 200 with version + uptime', async () => {
    const res = await app.request.get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
    expect((res.body as { version: string }).version).toBeTypeOf('string');
    expect((res.body as { uptimeSeconds: number }).uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('GET /api/health/live returns 200 (liveness alias)', async () => {
    const res = await app.request.get('/api/health/live');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });

  it('GET /api/health/ready returns 200|503 with named probes', async () => {
    const res = await app.request.get('/api/health/ready');
    expect([200, 503]).toContain(res.status);
    const body = res.body as {
      status: 'ok' | 'down';
      probes: Array<{ name: string; status: string; latencyMs: number }>;
    };
    expect(['ok', 'down']).toContain(body.status);
    expect(body.probes.length).toBeGreaterThan(0);
    const names = body.probes.map((p) => p.name);
    expect(names).toContain('prisma');
    expect(names).toContain('cache');
  });
});
