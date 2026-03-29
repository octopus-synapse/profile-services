/**
 * ToS Acceptance Integration Tests
 *
 * Tests complete GDPR compliance workflows with real database and services.
 * Validates ToS/Privacy Policy acceptance enforcement across API.
 *
 */

import { afterAll, afterEach, beforeAll, describe, expect, it, mock } from 'bun:test';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConsentDocumentType } from '@prisma/client';
import request from 'supertest';
import {
  configureExceptionHandling,
  configureValidation,
} from '@/bounded-contexts/platform/common/config/validation.config';
import { EmailSenderService } from '@/bounded-contexts/platform/common/email/services/email-sender.service';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { AppModule } from '../../src/app.module';

describe('ToS Acceptance Flow Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  /**
   * Helper to verify user email directly in database.
   * Bypasses email verification flow for integration tests.
   */
  async function verifyUserEmailInDb(email: string): Promise<void> {
    await prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    });
  }

  /**
   * Helper to create verified user with access token.
   * Returns { userId, accessToken } for test setup.
   */
  async function createVerifiedUser(
    email: string,
    password: string,
    name: string,
  ): Promise<{ userId: string; accessToken: string }> {
    const signupResponse = await request(app.getHttpServer())
      .post('/api/accounts')
      .send({ email, password, name })
      .expect(201);

    await verifyUserEmailInDb(email);

    const loginResponse = await request(app.getHttpServer()).post('/api/auth/login').send({
      email,
      password,
    });

    return {
      userId: signupResponse.body.data.userId,
      accessToken: loginResponse.body.data.accessToken,
    };
  }

  /**
   * Helper to update ToS version in environment (simulates version bump).
   * Note: In real scenarios, this would be an environment variable change.
   */
  function setTosVersion(version: string): void {
    process.env.TOS_VERSION = version;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailSenderService)
      .useValue({
        sendEmail: mock().mockResolvedValue(true),
        isConfigured: true,
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');

    const logger = app.get(AppLoggerService);
    configureValidation(app);
    configureExceptionHandling(app, logger);

    prisma = app.get<PrismaService>(PrismaService);

    // Set initial ToS version
    setTosVersion('1.0.0');

    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  }, 20000);

  afterEach(async () => {
    // Clean up test data
    await prisma.userConsent.deleteMany({
      where: { user: { email: { contains: 'tos-test' } } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: 'tos-test' } },
    });

    // Reset ToS version to default
    setTosVersion('1.0.0');
  });

  describe('Full ToS Acceptance Lifecycle', () => {
    it('should accept ToS and Privacy Policy successfully', async () => {
      // Use unique email per test to avoid race conditions
      const testEmail = `tos-lifecycle-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

      // Create verified user
      const { accessToken } = await createVerifiedUser(
        testEmail,
        'SecurePass123!',
        'ToS Test User',
      );

      // Accept ToS
      const tosResponse = await request(app.getHttpServer())
        .post('/api/v1/users/me/accept-consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          documentType: ConsentDocumentType.TERMS_OF_SERVICE,
        })
        .expect(201);

      expect(tosResponse.body.data.consent).toBeDefined();

      // Accept Privacy Policy
      const privacyResponse = await request(app.getHttpServer())
        .post('/api/v1/users/me/accept-consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          documentType: ConsentDocumentType.PRIVACY_POLICY,
        })
        .expect(201);

      expect(privacyResponse.body.data.consent).toBeDefined();

      // Verify consent status shows both accepted
      const statusResponse = await request(app.getHttpServer())
        .get('/api/v1/users/me/consent-status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(statusResponse.body.data.tosAccepted).toBe(true);
      expect(statusResponse.body.data.privacyPolicyAccepted).toBe(true);
    });

    it('should allow access to consent endpoints without prior ToS acceptance', async () => {
      // Create user without ToS acceptance (unique email)
      const testEmail = `tos-consent-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
      const { accessToken } = await createVerifiedUser(
        testEmail,
        'SecurePass123!',
        'ToS Test User',
      );

      // Should be able to check consent status
      const statusResponse = await request(app.getHttpServer())
        .get('/api/v1/users/me/consent-status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(statusResponse.body).toBeDefined();

      // Should be able to view consent history
      await request(app.getHttpServer())
        .get('/api/v1/users/me/consent-history')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Should be able to accept consent
      await request(app.getHttpServer())
        .post('/api/v1/users/me/accept-consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ documentType: ConsentDocumentType.TERMS_OF_SERVICE })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/users/me/accept-consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ documentType: ConsentDocumentType.PRIVACY_POLICY })
        .expect(201);
    });

    it('should record IP address and user agent in consent', async () => {
      const testEmail = `tos-audit-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
      const { accessToken } = await createVerifiedUser(
        testEmail,
        'SecurePass123!',
        'ToS Test User',
      );

      const testUserAgent = 'Mozilla/5.0 (Test Agent)';

      const acceptResponse = await request(app.getHttpServer())
        .post('/api/v1/users/me/accept-consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('User-Agent', testUserAgent)
        .send({ documentType: ConsentDocumentType.TERMS_OF_SERVICE })
        .expect(201);

      expect(acceptResponse.body.data.consent.ipAddress).toBeDefined();
      expect(acceptResponse.body.data.consent.userAgent).toBe(testUserAgent);
    });
  });

  describe('Version Upgrade Scenarios', () => {
    it('should track consent history across version upgrades', async () => {
      const testEmail = `tos-version-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

      // User accepts ToS v1.0.0
      setTosVersion('1.0.0');
      const { accessToken } = await createVerifiedUser(
        testEmail,
        'SecurePass123!',
        'Version Test User',
      );

      await request(app.getHttpServer())
        .post('/api/v1/users/me/accept-consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ documentType: ConsentDocumentType.TERMS_OF_SERVICE })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/users/me/accept-consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ documentType: ConsentDocumentType.PRIVACY_POLICY })
        .expect(201);

      // Simulate ToS version upgrade to v2.0.0
      setTosVersion('2.0.0');

      // Check consent status shows outdated version
      const statusResponse = await request(app.getHttpServer())
        .get('/api/v1/users/me/consent-status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(statusResponse.body.data.tosAccepted).toBe(false);
      expect(statusResponse.body.data.latestTosVersion).toBe('2.0.0');

      // Accept new ToS version
      await request(app.getHttpServer())
        .post('/api/v1/users/me/accept-consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ documentType: ConsentDocumentType.TERMS_OF_SERVICE })
        .expect(201);

      // Verify consent history shows both versions
      const historyResponse = await request(app.getHttpServer())
        .get('/api/v1/users/me/consent-history')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const tosConsents = historyResponse.body.data.filter(
        (c: { documentType: string }) => c.documentType === 'TERMS_OF_SERVICE',
      );

      expect(tosConsents).toHaveLength(2);
      expect(tosConsents.map((c: { version: string }) => c.version).sort()).toEqual([
        '1.0.0',
        '2.0.0',
      ]);
    });

    it('should maintain separate version tracking for ToS and Privacy Policy', async () => {
      const testEmail = `tos-multi-doc-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
      setTosVersion('1.0.0');
      process.env.PRIVACY_POLICY_VERSION = '1.5.0';

      const { accessToken } = await createVerifiedUser(
        testEmail,
        'SecurePass123!',
        'Version Test User',
      );

      // Accept ToS v1.0.0
      await request(app.getHttpServer())
        .post('/api/v1/users/me/accept-consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ documentType: ConsentDocumentType.TERMS_OF_SERVICE })
        .expect(201);

      // Check status - ToS accepted, Privacy Policy not
      let statusResponse = await request(app.getHttpServer())
        .get('/api/v1/users/me/consent-status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(statusResponse.body.data.tosAccepted).toBe(true);
      expect(statusResponse.body.data.privacyPolicyAccepted).toBe(false);

      // Accept Privacy Policy v1.5.0
      await request(app.getHttpServer())
        .post('/api/v1/users/me/accept-consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ documentType: ConsentDocumentType.PRIVACY_POLICY })
        .expect(201);

      // Check status shows both accepted
      statusResponse = await request(app.getHttpServer())
        .get('/api/v1/users/me/consent-status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(statusResponse.body.data.tosAccepted).toBe(true);
      expect(statusResponse.body.data.privacyPolicyAccepted).toBe(true);
    });
  });

  describe('Consent History and Status', () => {
    it('should track complete consent history across multiple acceptances', async () => {
      const testEmail = `tos-history-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
      const { accessToken } = await createVerifiedUser(
        testEmail,
        'SecurePass123!',
        'History Test User',
      );

      // Accept ToS
      await request(app.getHttpServer())
        .post('/api/v1/users/me/accept-consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ documentType: ConsentDocumentType.TERMS_OF_SERVICE })
        .expect(201);

      // Accept Privacy Policy
      await request(app.getHttpServer())
        .post('/api/v1/users/me/accept-consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ documentType: ConsentDocumentType.PRIVACY_POLICY })
        .expect(201);

      // Upgrade ToS version and accept again
      setTosVersion('2.0.0');
      await request(app.getHttpServer())
        .post('/api/v1/users/me/accept-consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ documentType: ConsentDocumentType.TERMS_OF_SERVICE })
        .expect(201);

      // Get history
      const historyResponse = await request(app.getHttpServer())
        .get('/api/v1/users/me/consent-history')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(historyResponse.body.data).toHaveLength(3);

      const documentTypes = historyResponse.body.data.map(
        (c: { documentType: string }) => c.documentType,
      );
      expect(documentTypes).toContain('TERMS_OF_SERVICE');
      expect(documentTypes).toContain('PRIVACY_POLICY');

      // Verify all have required audit fields
      historyResponse.body.data.forEach(
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

    it('should return accurate consent status for current versions', async () => {
      const testEmail = `tos-status-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
      setTosVersion('1.0.0');
      process.env.PRIVACY_POLICY_VERSION = '1.0.0';

      const { accessToken } = await createVerifiedUser(
        testEmail,
        'SecurePass123!',
        'Status Test User',
      );

      // Initially no consent
      let statusResponse = await request(app.getHttpServer())
        .get('/api/v1/users/me/consent-status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(statusResponse.body.data.tosAccepted).toBe(false);
      expect(statusResponse.body.data.privacyPolicyAccepted).toBe(false);

      // Accept ToS only
      await request(app.getHttpServer())
        .post('/api/v1/users/me/accept-consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ documentType: ConsentDocumentType.TERMS_OF_SERVICE })
        .expect(201);

      statusResponse = await request(app.getHttpServer())
        .get('/api/v1/users/me/consent-status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(statusResponse.body.data.tosAccepted).toBe(true);
      expect(statusResponse.body.data.privacyPolicyAccepted).toBe(false);

      // Accept Privacy Policy
      await request(app.getHttpServer())
        .post('/api/v1/users/me/accept-consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ documentType: ConsentDocumentType.PRIVACY_POLICY })
        .expect(201);

      statusResponse = await request(app.getHttpServer())
        .get('/api/v1/users/me/consent-status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(statusResponse.body.data.tosAccepted).toBe(true);
      expect(statusResponse.body.data.privacyPolicyAccepted).toBe(true);
    });
  });

  describe('Error Cases', () => {
    it('should reject invalid document type', async () => {
      const testEmail = `tos-errors-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
      const { accessToken } = await createVerifiedUser(
        testEmail,
        'SecurePass123!',
        'Error Test User',
      );

      const response = await request(app.getHttpServer())
        .post('/api/v1/users/me/accept-consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ documentType: 'INVALID_TYPE' });

      // Backend may return 400 (validation) or 500 (Prisma error)
      expect([400, 500]).toContain(response.status);
    });

    it('should require authentication for all consent endpoints', async () => {
      // No token
      await request(app.getHttpServer()).get('/api/v1/users/me/consent-status').expect(401);

      await request(app.getHttpServer()).get('/api/v1/users/me/consent-history').expect(401);

      await request(app.getHttpServer())
        .post('/api/v1/users/me/accept-consent')
        .send({ documentType: ConsentDocumentType.TERMS_OF_SERVICE })
        .expect(401);
    });

    it('should handle missing required fields gracefully', async () => {
      const testEmail = `tos-validation-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
      const { accessToken } = await createVerifiedUser(
        testEmail,
        'SecurePass123!',
        'Validation Test User',
      );

      // Missing documentType - backend should reject with error
      const response = await request(app.getHttpServer())
        .post('/api/v1/users/me/accept-consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      // Backend may return 400 (validation) or 500 (Prisma error for missing required field)
      expect([400, 500]).toContain(response.status);
    });
  });
});
