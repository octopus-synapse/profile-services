/**
 * ToS Acceptance Integration Tests
 *
 * Tests complete GDPR compliance workflows with real database and services.
 * Validates ToS/Privacy Policy acceptance enforcement across API.
 *
 * Uncle Bob: "Integration tests validate system architecture, not isolated units"
 * Kent Beck: "Test the behavior users care about"
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  mock,
} from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ConsentDocumentType } from '@prisma/client';

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
      .post('/api/v1/auth/signup')
      .send({ email, password, name })
      .expect(201);

    await verifyUserEmailInDb(email);

    return {
      userId: signupResponse.body.data.user.id,
      accessToken: signupResponse.body.data.accessToken,
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
      .overrideProvider('EmailSenderService')
      .useValue({
        sendEmail: mock().mockResolvedValue(true),
        isConfigured: true,
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    prisma = app.get<PrismaService>(PrismaService);

    // Set initial ToS version
    setTosVersion('1.0.0');

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

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
    const testUser = {
      email: 'tos-test-user@example.com',
      password: 'SecurePass123!',
      name: 'ToS Test User',
    };

    it('should block access to protected routes until ToS accepted', async () => {
      // Step 1: Create verified user (email verified, but no ToS acceptance)
      const { accessToken } = await createVerifiedUser(
        testUser.email,
        testUser.password,
        testUser.name,
      );

      // Step 2: Attempt to access protected route - should be BLOCKED
      const blockedResponse = await request(app.getHttpServer())
        .get('/api/v1/resumes')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(blockedResponse.body.message).toMatch(
        /Terms of Service|ToS|consent/i,
      );

      // Step 3: Accept ToS
      await request(app.getHttpServer())
        .post('/api/v1/users/me/accept-consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          documentType: ConsentDocumentType.TERMS_OF_SERVICE,
        })
        .expect(201);

      // Step 3.5: Accept Privacy Policy (required for access)
      await request(app.getHttpServer())
        .post('/api/v1/users/me/accept-consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          documentType: ConsentDocumentType.PRIVACY_POLICY,
        })
        .expect(201);

      // Step 4: Access same protected route - should now SUCCEED
      const allowedResponse = await request(app.getHttpServer())
        .get('/api/v1/resumes')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(allowedResponse.body).toBeDefined();
    });

    it('should allow access to consent endpoints without prior ToS acceptance', async () => {
      // Create user without ToS acceptance
      const { accessToken } = await createVerifiedUser(
        'tos-test-consent-only@example.com',
        testUser.password,
        testUser.name,
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
      const { accessToken } = await createVerifiedUser(
        'tos-test-audit@example.com',
        testUser.password,
        testUser.name,
      );

      const testUserAgent = 'Mozilla/5.0 (Test Agent)';

      const acceptResponse = await request(app.getHttpServer())
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
    const testUser = {
      email: 'tos-test-version@example.com',
      password: 'SecurePass123!',
      name: 'Version Test User',
    };

    it('should block access when ToS version is upgraded until new version accepted', async () => {
      // Step 1: User accepts ToS v1.0.0
      setTosVersion('1.0.0');
      const { accessToken } = await createVerifiedUser(
        testUser.email,
        testUser.password,
        testUser.name,
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

      // Verify access works with v1.0.0
      await request(app.getHttpServer())
        .get('/api/v1/resumes')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Step 2: Simulate ToS version upgrade to v2.0.0
      setTosVersion('2.0.0');

      // User should be blocked from accessing protected routes
      const blockedResponse = await request(app.getHttpServer())
        .get('/api/v1/resumes')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(blockedResponse.body.message).toMatch(/Terms of Service|ToS/i);

      // Step 3: Check consent status shows outdated version
      const statusResponse = await request(app.getHttpServer())
        .get('/api/v1/users/me/consent-status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(statusResponse.body.tosAccepted).toBe(false);
      expect(statusResponse.body.latestTosVersion).toBe('2.0.0');

      // Step 4: Accept new ToS version
      await request(app.getHttpServer())
        .post('/api/v1/users/me/accept-consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ documentType: ConsentDocumentType.TERMS_OF_SERVICE })
        .expect(201);

      // Step 5: Access should now work again
      await request(app.getHttpServer())
        .get('/api/v1/resumes')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify consent history shows both versions
      const historyResponse = await request(app.getHttpServer())
        .get('/api/v1/users/me/consent-history')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const tosConsents = historyResponse.body.filter(
        (c: any) => c.documentType === 'TERMS_OF_SERVICE',
      );

      expect(tosConsents).toHaveLength(2);
      expect(tosConsents.map((c: any) => c.version).sort()).toEqual([
        '1.0.0',
        '2.0.0',
      ]);
    });

    it('should maintain separate version tracking for ToS and Privacy Policy', async () => {
      setTosVersion('1.0.0');
      process.env.PRIVACY_POLICY_VERSION = '1.5.0';

      const { accessToken } = await createVerifiedUser(
        'tos-test-multi-doc@example.com',
        testUser.password,
        testUser.name,
      );

      // Accept ToS v1.0.0
      await request(app.getHttpServer())
        .post('/api/v1/users/me/accept-consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ documentType: ConsentDocumentType.TERMS_OF_SERVICE })
        .expect(201);

      // User should still be blocked (Privacy Policy not accepted)
      await request(app.getHttpServer())
        .get('/api/v1/resumes')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      // Accept Privacy Policy v1.5.0
      await request(app.getHttpServer())
        .post('/api/v1/users/me/accept-consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ documentType: ConsentDocumentType.PRIVACY_POLICY })
        .expect(201);

      // Now access should work
      await request(app.getHttpServer())
        .get('/api/v1/resumes')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Check status shows both accepted
      const statusResponse = await request(app.getHttpServer())
        .get('/api/v1/users/me/consent-status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(statusResponse.body.tosAccepted).toBe(true);
      expect(statusResponse.body.privacyPolicyAccepted).toBe(true);
    });
  });

  describe('Consent History and Status', () => {
    const testUser = {
      email: 'tos-test-history@example.com',
      password: 'SecurePass123!',
      name: 'History Test User',
    };

    it('should track complete consent history across multiple acceptances', async () => {
      const { accessToken } = await createVerifiedUser(
        testUser.email,
        testUser.password,
        testUser.name,
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

      expect(historyResponse.body).toHaveLength(3);

      const documentTypes = historyResponse.body.map(
        (c: any) => c.documentType,
      );
      expect(documentTypes).toContain('TERMS_OF_SERVICE');
      expect(documentTypes).toContain('PRIVACY_POLICY');

      // Verify all have required audit fields
      historyResponse.body.forEach((consent: any) => {
        expect(consent.id).toBeDefined();
        expect(consent.version).toBeDefined();
        expect(consent.acceptedAt).toBeDefined();
        expect(consent.ipAddress).toBeDefined();
        expect(consent.userAgent).toBeDefined();
      });
    });

    it('should return accurate consent status for current versions', async () => {
      setTosVersion('1.0.0');
      process.env.PRIVACY_POLICY_VERSION = '1.0.0';

      const { accessToken } = await createVerifiedUser(
        'tos-test-status@example.com',
        testUser.password,
        testUser.name,
      );

      // Initially no consent
      let statusResponse = await request(app.getHttpServer())
        .get('/api/v1/users/me/consent-status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(statusResponse.body.tosAccepted).toBe(false);
      expect(statusResponse.body.privacyPolicyAccepted).toBe(false);

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

      expect(statusResponse.body.tosAccepted).toBe(true);
      expect(statusResponse.body.privacyPolicyAccepted).toBe(false);

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

      expect(statusResponse.body.tosAccepted).toBe(true);
      expect(statusResponse.body.privacyPolicyAccepted).toBe(true);
    });
  });

  describe('Error Cases', () => {
    const testUser = {
      email: 'tos-test-errors@example.com',
      password: 'SecurePass123!',
      name: 'Error Test User',
    };

    it('should reject invalid document type', async () => {
      const { accessToken } = await createVerifiedUser(
        testUser.email,
        testUser.password,
        testUser.name,
      );

      const response = await request(app.getHttpServer())
        .post('/api/v1/users/me/accept-consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ documentType: 'INVALID_TYPE' })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should require authentication for all consent endpoints', async () => {
      // No token
      await request(app.getHttpServer())
        .get('/api/v1/users/me/consent-status')
        .expect(401);

      await request(app.getHttpServer())
        .get('/api/v1/users/me/consent-history')
        .expect(401);

      await request(app.getHttpServer())
        .post('/api/v1/users/me/accept-consent')
        .send({ documentType: ConsentDocumentType.TERMS_OF_SERVICE })
        .expect(401);
    });

    it('should handle missing required fields gracefully', async () => {
      const { accessToken } = await createVerifiedUser(
        'tos-test-validation@example.com',
        testUser.password,
        testUser.name,
      );

      // Missing documentType
      const response = await request(app.getHttpServer())
        .post('/api/v1/users/me/accept-consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });
});
