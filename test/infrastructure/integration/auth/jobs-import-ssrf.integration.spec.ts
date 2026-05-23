/**
 * P1 #6 — POST /v1/jobs/import-from-url SSRF defense.
 *
 * `job-import.service.ts` already routes user-supplied URLs through
 * `SafeFetchPort` (instead of the raw global `fetch`). The port
 * rejects loopback, RFC1918, link-local (incl. cloud metadata
 * `169.254.169.254`), and the IPv4-mapped IPv6 variants of all of
 * those. This spec exercises a few representative bad URLs to pin the
 * behaviour at the HTTP boundary.
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { closeApp, createTestUserAndLogin, getApp, getRequest } from '../setup';

describe('P1 #6 — POST /v1/jobs/import-from-url SSRF defense', () => {
  let token: string;

  beforeAll(async () => {
    await getApp();
    const auth = await createTestUserAndLogin();
    token = auth.accessToken;
  });

  afterAll(async () => {
    await closeApp();
  });

  const ssrfTargets = [
    'http://127.0.0.1:80/',
    'http://localhost:8080/admin',
    'http://169.254.169.254/latest/meta-data/', // AWS instance-metadata
    'http://10.0.0.1/internal',
    'file:///etc/passwd',
  ];

  for (const url of ssrfTargets) {
    it(`rejects ${url}`, async () => {
      const res = await getRequest()
        .post('/api/v1/jobs/import-from-url')
        .set('Authorization', `Bearer ${token}`)
        .send({ url });

      // SafeFetchBlockedError -> JobImportInvalidUrlException -> 4xx.
      // The exact code depends on the i18n mapping; SSRF-flagged URLs
      // never reach the LLM (the assertion that matters).
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });
  }
});
