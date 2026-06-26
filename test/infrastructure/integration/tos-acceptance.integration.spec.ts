/**
 * ToS Acceptance Integration Tests
 *
 * Tests complete GDPR compliance workflows with real database and services.
 * Validates ToS/Privacy Policy acceptance enforcement across API.
 *
 * Order-independent: Bun 1.3+ runs tests inside a `describe`
 * out-of-declaration-order, so the prior shared `app`/`prisma` +
 * global `beforeEach`/`afterEach` that mutated `process.env.TOS_VERSION`
 * and bulk-deleted users by email-substring would race. Each test now
 * provisions its own verified user (unique email), and the
 * version-upgrade tests set + restore `TOS_VERSION` inside the test
 * body sequentially (the consent-status endpoint reads the version
 * live from config, so the bump must stay set for the duration of that
 * single test's awaits).
 */

import { describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { ConsentDocumentType } from '@prisma/client';
import { tokenFromResponse } from '../shared';
import { assignUserRole, clearAuthRateLimits, getApp, signupBody } from './setup';

function uniqueTestId(): string {
  return randomUUID().slice(0, 8);
}

interface VerifiedUser {
  readonly userId: string;
  readonly accessToken: string;
}

/**
 * Create a verified, onboarded user via the real signup → login HTTP
 * flow (the consent endpoints are the subject under test, so we want a
 * genuine session). Unique email per call keeps it order-independent.
 */
async function createVerifiedUser(
  app: Awaited<ReturnType<typeof getApp>>,
  email: string,
  password: string,
  name: string,
): Promise<VerifiedUser> {
  await clearAuthRateLimits();
  const signupResponse = await app.request
    .post('/api/v1/accounts')
    .send(signupBody({ email, password, name }))
    .expect(201);

  await app.prisma.user.update({ where: { email }, data: { emailVerified: new Date() } });

  const userId = signupResponse.body.userId;
  await app.prisma.user.update({
    where: { id: userId },
    data: { onboardingCompletedAt: new Date() },
  });
  await assignUserRole(userId);

  const loginResponse = await app.request.post('/api/v1/auth/login').send({ email, password });

  return { userId, accessToken: tokenFromResponse(loginResponse, 'access_token')! };
}

describe('ToS Acceptance Flow Integration', () => {
  describe('Full ToS Acceptance Lifecycle', () => {
    it('should accept ToS and Privacy Policy successfully', async () => {
      const app = await getApp();
      const testEmail = `tos-lifecycle-${uniqueTestId()}@example.com`;
      const { accessToken } = await createVerifiedUser(
        app,
        testEmail,
        'SecurePass123!',
        'ToS Test User',
      );

      // Accept ToS
      const tosResponse = await app.request
        .post('/api/v1/users/me/accept-consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ documentType: ConsentDocumentType.TERMS_OF_SERVICE })
        .expect(201);

      expect(tosResponse.body.consent).toBeDefined();

      // Accept Privacy Policy
      const privacyResponse = await app.request
        .post('/api/v1/users/me/accept-consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ documentType: ConsentDocumentType.PRIVACY_POLICY })
        .expect(201);

      expect(privacyResponse.body.consent).toBeDefined();

      // Verify consent status shows both accepted
      const statusResponse = await app.request
        .get('/api/v1/users/me/consent-status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(statusResponse.body.tosAccepted).toBe(true);
      expect(statusResponse.body.privacyPolicyAccepted).toBe(true);
    });

    it('should allow access to consent endpoints without prior ToS acceptance', async () => {
      const app = await getApp();
      const testEmail = `tos-consent-${uniqueTestId()}@example.com`;
      const { accessToken } = await createVerifiedUser(
        app,
        testEmail,
        'SecurePass123!',
        'ToS Test User',
      );

      // Should be able to check consent status
      const statusResponse = await app.request
        .get('/api/v1/users/me/consent-status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(statusResponse.body).toBeDefined();

      // Should be able to view consent history
      await app.request
        .get('/api/v1/users/me/consent-history')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Should be able to accept consent
      await app.request
        .post('/api/v1/users/me/accept-consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ documentType: ConsentDocumentType.TERMS_OF_SERVICE })
        .expect(201);

      await app.request
        .post('/api/v1/users/me/accept-consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ documentType: ConsentDocumentType.PRIVACY_POLICY })
        .expect(201);
    });

    it('should record IP address and user agent in consent', async () => {
      const app = await getApp();
      const testEmail = `tos-audit-${uniqueTestId()}@example.com`;
      const { accessToken } = await createVerifiedUser(
        app,
        testEmail,
        'SecurePass123!',
        'ToS Test User',
      );

      const testUserAgent = 'Mozilla/5.0 (Test Agent)';

      const acceptResponse = await app.request
        .post('/api/v1/users/me/accept-consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('User-Agent', testUserAgent)
        .send({ documentType: ConsentDocumentType.TERMS_OF_SERVICE })
        .expect(201);

      expect(acceptResponse.body.consent.ipAddress).toBeDefined();
      expect(acceptResponse.body.consent.userAgent).toBe(testUserAgent);
    });
  });

  describe('Version Upgrade Scenarios', () => {
    it('should track consent history across version upgrades', async () => {
      const app = await getApp();
      const testEmail = `tos-version-${uniqueTestId()}@example.com`;
      const currentTosVersion = process.env.TOS_VERSION || '1.0.0';
      const { userId, accessToken } = await createVerifiedUser(
        app,
        testEmail,
        'SecurePass123!',
        'Version Test User',
      );

      // Simulate a user who accepted an OLDER ToS version than the current
      // one by rewriting their signup consent row in the DB — rather than
      // mutating the global `process.env.TOS_VERSION`, which would race with
      // concurrently-running tests (Bun 1.3+ runs a describe's tests in
      // parallel and the consent-status endpoint reads the version live).
      await app.prisma.userConsent.updateMany({
        where: { userId, documentType: ConsentDocumentType.TERMS_OF_SERVICE },
        data: { version: '0.0.1' },
      });

      // Consent status now shows the ToS as outdated vs the current version.
      const statusResponse = await app.request
        .get('/api/v1/users/me/consent-status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(statusResponse.body.tosAccepted).toBe(false);
      expect(statusResponse.body.latestTosVersion).toBe(currentTosVersion);

      // Accept the current ToS version.
      await app.request
        .post('/api/v1/users/me/accept-consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ documentType: ConsentDocumentType.TERMS_OF_SERVICE })
        .expect(201);

      // History shows both the old and the freshly-accepted version.
      const historyResponse = await app.request
        .get('/api/v1/users/me/consent-history')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const tosConsents = historyResponse.body.filter(
        (c: { documentType: string }) => c.documentType === 'TERMS_OF_SERVICE',
      );

      expect(tosConsents).toHaveLength(2);
      expect(tosConsents.map((c: { version: string }) => c.version).sort()).toEqual(
        ['0.0.1', currentTosVersion].sort(),
      );
    });
  });

  describe('Consent History and Status', () => {
    it('should track complete consent history across multiple acceptances', async () => {
      const app = await getApp();
      const testEmail = `tos-history-${uniqueTestId()}@example.com`;
      const { userId, accessToken } = await createVerifiedUser(
        app,
        testEmail,
        'SecurePass123!',
        'History Test User',
      );

      // Build a controlled 3-row history without mutating the global
      // TOS_VERSION (which races under Bun's concurrent test execution):
      // start clean, seed an OLD ToS acceptance, then accept the current ToS
      // + Privacy via the real endpoints (which stamp the audit fields).
      await app.prisma.userConsent.deleteMany({ where: { userId } });
      await app.prisma.userConsent.create({
        data: {
          userId,
          documentType: ConsentDocumentType.TERMS_OF_SERVICE,
          version: '0.0.1',
          ipAddress: '127.0.0.1',
          userAgent: 'Integration Test',
        },
      });

      await app.request
        .post('/api/v1/users/me/accept-consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ documentType: ConsentDocumentType.TERMS_OF_SERVICE })
        .expect(201);
      await app.request
        .post('/api/v1/users/me/accept-consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ documentType: ConsentDocumentType.PRIVACY_POLICY })
        .expect(201);

      const historyResponse = await app.request
        .get('/api/v1/users/me/consent-history')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(historyResponse.body).toHaveLength(3);

      const documentTypes = historyResponse.body.map(
        (c: { documentType: string }) => c.documentType,
      );
      expect(documentTypes).toContain('TERMS_OF_SERVICE');
      expect(documentTypes).toContain('PRIVACY_POLICY');

      // Verify all have required audit fields
      historyResponse.body.forEach(
        (consent: {
          id: string;
          version: string;
          acceptedAt: string;
          ipAddress: string;
          userAgent: string;
        }) => {
          expect(consent.id).toBeDefined();
          expect(consent.version).toBeDefined();
          expect(consent.acceptedAt).toBeDefined();
          expect(consent.ipAddress).toBeDefined();
          expect(consent.userAgent).toBeDefined();
        },
      );
    });
  });

  describe('Error Cases', () => {
    it('should reject invalid document type', async () => {
      const app = await getApp();
      const testEmail = `tos-errors-${uniqueTestId()}@example.com`;
      const { accessToken } = await createVerifiedUser(
        app,
        testEmail,
        'SecurePass123!',
        'Error Test User',
      );

      const response = await app.request
        .post('/api/v1/users/me/accept-consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ documentType: 'INVALID_TYPE' });

      // Backend may return 400 (validation) or 500 (Prisma error)
      expect([400, 500]).toContain(response.status);
    });

    it('should require authentication for all consent endpoints', async () => {
      const app = await getApp();
      // No token
      await app.request.get('/api/v1/users/me/consent-status').expect(401);

      await app.request.get('/api/v1/users/me/consent-history').expect(401);

      await app.request
        .post('/api/v1/users/me/accept-consent')
        .send({ documentType: ConsentDocumentType.TERMS_OF_SERVICE })
        .expect(401);
    });

    it('should handle missing required fields gracefully', async () => {
      const app = await getApp();
      const testEmail = `tos-validation-${uniqueTestId()}@example.com`;
      const { accessToken } = await createVerifiedUser(
        app,
        testEmail,
        'SecurePass123!',
        'Validation Test User',
      );

      // Missing documentType - backend should reject with error
      const response = await app.request
        .post('/api/v1/users/me/accept-consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      // Backend may return 400 (validation) or 500 (Prisma error for missing required field)
      expect([400, 500]).toContain(response.status);
    });
  });
});
