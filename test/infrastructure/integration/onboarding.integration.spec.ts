/**
 * Onboarding Flow Integration Tests
 *
 * Tests onboarding lifecycle with real database.
 * Validates business rules for onboarding endpoints.
 *
 * Order-independent: Bun 1.3+ runs tests inside a `describe`
 * out-of-declaration-order and runs spec files concurrently. The prior
 * shared `accessToken`/`userId` (set in `beforeEach`, read in the
 * `it`s) plus per-test `prisma.user.delete` + email-substring deletes
 * raced across tests AND across files. Each test now drives the REAL
 * signup → verify-email → login HTTP flow with its OWN unique email,
 * so it owns its session for its lifetime — no cross-test cleanup, no
 * shared mutable state.
 */

import { beforeEach, describe, expect, it } from 'bun:test';

import { tokenFromResponse } from '../shared';
import { clearAuthRateLimits, getApp, signupBody, uniqueTestId, uniqueTestUsername } from './setup';

interface SessionUser {
  readonly accessToken: string;
}

/**
 * Create a verified user via the real signup + login HTTP flow with a
 * unique email, leaving onboarding INCOMPLETE (this suite exercises
 * that flow). Unique email per call keeps it order/file-independent.
 */
async function createVerifiedUser(app: Awaited<ReturnType<typeof getApp>>): Promise<SessionUser> {
  const email = `onboarding-${uniqueTestId()}@test.com`;
  const password = 'SecurePass123!';

  const signupResponse = await app.request
    .post('/api/v1/accounts')
    .send(signupBody({ email, password, name: 'Onboarding Test User' }))
    .expect(201);

  // Verify email so the email-verified guard lets the test through;
  // onboarding stays incomplete since that flow is the subject here.
  await app.prisma.user.update({
    where: { id: signupResponse.body.userId },
    data: { emailVerified: new Date() },
  });

  const loginResponse = await app.request.post('/api/v1/auth/login').send({ email, password });

  return { accessToken: tokenFromResponse(loginResponse, 'access_token')! };
}

describe('Onboarding Flow Integration', () => {
  beforeEach(async () => {
    // RATE_LIMIT_ENABLED=true in .env.test; clearing the IP-keyed
    // signup/login buckets per test keeps a long concurrent run from
    // 429-ing here on shared-IP bucket bleed.
    await clearAuthRateLimits();
  });

  describe('Onboarding Status', () => {
    it('should return onboarding status for new user', async () => {
      const app = await getApp();
      const { accessToken } = await createVerifiedUser(app);

      const response = await app.request
        .get('/api/v1/onboarding/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.hasCompletedOnboarding).toBe(false);
    });

    it('should reject unauthenticated requests', async () => {
      const app = await getApp();
      await app.request.get('/api/v1/onboarding/status').expect(401);
    });
  });

  describe('Onboarding Progress', () => {
    it('should get initial progress for new user', async () => {
      const app = await getApp();
      const { accessToken } = await createVerifiedUser(app);

      const response = await app.request
        .get('/api/v1/onboarding/progress')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      // Initial progress should have default values
      expect(response.body.currentStep).toBeDefined();
    });

    it('should save onboarding progress', async () => {
      const app = await getApp();
      const { accessToken } = await createVerifiedUser(app);

      const progressData = {
        currentStep: 'personal-info',
        completedSteps: ['welcome'],
        personalInfo: {
          fullName: 'Test User',
          email: 'test@example.com',
        },
      };

      const response = await app.request
        .put('/api/v1/onboarding/progress')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(progressData)
        .expect(200);

      expect(response.body).toBeDefined();
      // success is at envelope level
    });

    it('should reject unauthenticated progress save', async () => {
      const app = await getApp();
      await app.request
        .put('/api/v1/onboarding/progress')
        .send({ currentStep: 'personalInfo' })
        .expect(401);
    });
  });

  describe('Complete Onboarding', () => {
    it('should complete onboarding with valid data', async () => {
      const app = await getApp();
      const { accessToken } = await createVerifiedUser(app);

      const onboardingData = {
        username: uniqueTestUsername('testuser'),
        personalInfo: {
          fullName: 'Complete User',
          email: 'complete@test.com',
        },
        professionalProfile: {
          jobTitle: 'Software Engineer',
          summary: 'Experienced developer',
        },
        noExperience: true,
        experiences: [],
        noEducation: true,
        education: [],
        noSkills: true,
        skills: [],
        languages: [{ name: 'English', level: 'NATIVE' }],
        resumeStyleId: null,
      };

      const response = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(onboardingData);

      expect([200, 201].includes(response.status)).toBe(true);
    });

    it('should reject onboarding without authentication', async () => {
      const app = await getApp();
      await app.request.post('/api/v1/onboarding').send({ personalInfo: {} }).expect(401);
    });

    it('should reject invalid onboarding data', async () => {
      const app = await getApp();
      const { accessToken } = await createVerifiedUser(app);

      // Send invalid data (missing required fields)
      const response = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          personalInfo: { fullName: '' }, // Invalid: empty name
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });
});
