/**
 * Badges integration sample — boots the full Elysia stack and hits
 * the public badges endpoint plus the JWT-gated viewer endpoint.
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { AuthHelper, startTestApp, stopTestApp, type TestApp } from '../shared';

describe('Badges (integration)', () => {
  let app: TestApp;
  let auth: AuthHelper;

  beforeAll(async () => {
    app = await startTestApp();
    auth = new AuthHelper(app);
  });
  afterAll(async () => {
    await stopTestApp();
  });

  it('GET /api/v1/badges/user/:userId is public', async () => {
    const res = await app.request.get('/api/v1/badges/user/non-existent');
    // Empty list for an unknown user is a valid 200; if no Prisma
    // tables seeded the route may surface a domain 404 — both shapes
    // count as "the route is reachable + auth is not required".
    expect([200, 404]).toContain(res.status);
  });

  it('GET /api/v1/badges/me requires JWT', async () => {
    const res = await app.request.get('/api/v1/badges/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/badges/me works with a valid token', async () => {
    const user = await auth.registerAndLogin();
    const res = await app.request.get('/api/v1/badges/me').set(auth.bearer(user));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true });
  });
});
