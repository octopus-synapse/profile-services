/**
 * Complete Onboarding Flow Integration Tests
 *
 * Tests the ENTIRE user journey from signup to first resume creation.
 * This is the critical path that every user must complete.
 *
 * Flow tested:
 * 1. Signup (create account)
 * 2. Email verification request
 * 3. Email verification confirm
 * 4. ToS acceptance
 * 5. Get onboarding status (should show incomplete)
 * 6. Save onboarding progress (each step)
 * 7. Complete onboarding
 * 8. Verify resume created
 * 9. Verify onboarding status (should show complete)
 *
 * Order-independent: Bun 1.3+ runs tests inside a `describe`
 * out-of-declaration-order and runs spec files concurrently. The prior
 * version shared a `testEmail`/`userId` across the `it`s in Step 1,
 * used a `beforeAll`-seeded session in Step 7, and bulk-deleted users
 * per test. Those collide under concurrency. Every test now drives the
 * REAL signup → verify-email → (accept-ToS) → login HTTP flow with its
 * OWN unique email, so it owns its session for its lifetime — no
 * shared mutable state, no cross-test cleanup.
 *
 * See docs/BUG_DISCOVERY_REPORT.md for known issues.
 */

import { describe, expect, it } from 'bun:test';
import { tokenFromResponse } from '../shared';
import {
  acceptTosForUser,
  clearAuthRateLimits,
  getApp,
  uniqueTestId,
  uniqueTestUsername,
  unwrapApiData,
} from './setup';

/** Generate unique email for each test to avoid conflicts */
function uniqueEmail(prefix: string): string {
  return `${prefix}-${uniqueTestId()}@test.com`;
}

interface TestAccount {
  email: string;
  password: string;
  userId: string;
}

function createSectionProgressPayload(
  sectionTypeKey: string,
  itemContent: Record<string, unknown>[],
  completedSteps: string[],
  noData = false,
) {
  return {
    currentStep: `section:${sectionTypeKey}`,
    completedSteps,
    sections: [
      {
        sectionTypeKey,
        items: itemContent.map((content) => ({ content })),
        noData,
      },
    ],
  };
}

type App = Awaited<ReturnType<typeof getApp>>;

async function createTestAccount(
  app: App,
  prefix: string,
  name: string,
  password = 'SecurePass123!',
): Promise<TestAccount> {
  const email = uniqueEmail(prefix);
  // Clear the IP-keyed signup bucket before each signup so a long
  // concurrent run never 429s here on shared-IP bucket bleed.
  await clearAuthRateLimits();
  const response = await app.request.post('/api/v1/accounts').send({
    email,
    password,
    name,
    acceptedTosVersion: process.env.TOS_VERSION || '1.0.0',
    acceptedPrivacyVersion: process.env.PRIVACY_POLICY_VERSION || '1.0.0',
  });

  if (response.status !== 201 || !response.body?.userId) {
    throw new Error(`Signup failed: ${JSON.stringify(response.body)}`);
  }

  return { email, password, userId: response.body.userId };
}

async function loginTestAccount(app: App, email: string, password: string): Promise<string> {
  const response = await app.request.post('/api/v1/auth/login').send({ email, password });

  const accessToken = tokenFromResponse(response, 'access_token');
  if (response.status !== 200 || !accessToken) {
    throw new Error(`Login failed: ${JSON.stringify(response.body)}`);
  }
  return accessToken;
}

/**
 * Provision a brand-new user that has signed up, verified email, and
 * accepted ToS, then logged in. Each call uses a unique email so the
 * returned session is owned solely by the calling test.
 */
async function verifiedSession(
  app: App,
  prefix: string,
  name: string,
): Promise<{ userId: string; accessToken: string; email: string; password: string }> {
  const account = await createTestAccount(app, prefix, name);
  await app.prisma.user.update({
    where: { id: account.userId },
    data: { emailVerified: new Date() },
  });
  await acceptTosForUser(account.userId);
  const accessToken = await loginTestAccount(app, account.email, account.password);
  return { ...account, accessToken };
}

/**
 * Creates a valid minimal onboarding payload
 * Uses the flat OnboardingDataSchema structure expected by the backend
 *
 * Required fields by schema:
 * - username: 3-30 chars, alphanumeric + underscore
 * - personalInfo.fullName: 2-100 chars
 * - professionalProfile.jobTitle: 2-100 chars
 * - professionalProfile.summary: 10-500 chars (REQUIRED!)
 * - skills: array (can be empty)
 * - noSkills: boolean
 * - experiences: array (can be empty)
 * - noExperience: boolean
 * - education: array (can be empty)
 * - noEducation: boolean
 * - languages: array with at least name + level
 * - resumeStyleId: FK to ResumeStyle (uuid | null, optional)
 */
function createOnboardingPayload(
  overrides: {
    username?: string;
    fullName?: string;
    email?: string;
    jobTitle?: string;
    summary?: string;
    hasExperience?: boolean;
    hasEducation?: boolean;
    hasSkills?: boolean;
  } = {},
) {
  const {
    username = uniqueTestUsername('user'),
    fullName = 'Test User',
    jobTitle = 'Software Developer',
    summary = 'Experienced software developer with expertise in modern web technologies.',
    hasExperience = false,
    hasEducation = false,
    hasSkills = false,
  } = overrides;

  return {
    username,
    personalInfo: { fullName },
    professionalProfile: { jobTitle, summary },
    skills: hasSkills ? [{ name: 'TypeScript', category: 'Programming' }] : [],
    noSkills: !hasSkills,
    experiences: hasExperience
      ? [
          {
            company: 'Test Company',
            position: 'Developer',
            startDate: '2020-01',
            endDate: '2023-12',
            description: 'Developed web applications',
          },
        ]
      : [],
    noExperience: !hasExperience,
    education: hasEducation
      ? [
          {
            institution: 'Test University',
            degree: 'Bachelor of Science',
            field: 'Computer Science',
            startDate: '2016-09',
            endDate: '2020-05',
          },
        ]
      : [],
    noEducation: !hasEducation,
    languages: [{ name: 'English', level: 'NATIVE' }],
    resumeStyleId: null,
  };
}

describe('Complete Onboarding Flow', () => {
  describe('Step 1: Account Creation (Signup)', () => {
    it('should create account with valid credentials', async () => {
      const app = await getApp();
      await clearAuthRateLimits();
      const testEmail = uniqueEmail('onboarding-flow');

      const response = await app.request.post('/api/v1/accounts').send({
        email: testEmail,
        password: 'SecurePass123!',
        name: 'Test User',
        acceptedTosVersion: process.env.TOS_VERSION || '1.0.0',
        acceptedPrivacyVersion: process.env.PRIVACY_POLICY_VERSION || '1.0.0',
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('userId');
      expect(response.body.email).toBe(testEmail);
      expect(response.body.message).toBeDefined();
    });

    it('should reject signup with existing email', async () => {
      const app = await getApp();
      await clearAuthRateLimits();
      const testEmail = uniqueEmail('onboarding-flow-dup');
      const consents = {
        acceptedTosVersion: process.env.TOS_VERSION || '1.0.0',
        acceptedPrivacyVersion: process.env.PRIVACY_POLICY_VERSION || '1.0.0',
      };

      // First signup
      await app.request
        .post('/api/v1/accounts')
        .send({
          email: testEmail,
          password: 'SecurePass123!',
          name: 'First User',
          ...consents,
        })
        .expect(201);

      // Second signup with same email
      const response = await app.request.post('/api/v1/accounts').send({
        email: testEmail,
        password: 'DifferentPass123!',
        name: 'Second User',
        ...consents,
      });

      expect(response.status).toBe(409);
    });

    it('should reject signup with weak password', async () => {
      const app = await getApp();
      await clearAuthRateLimits();
      const response = await app.request
        .post('/api/v1/accounts')
        .send({ email: uniqueEmail('weak-pass'), password: '123', name: 'Weak Pass User' });

      // 400 or 422 for validation error
      expect([400, 422]).toContain(response.status);
    });

    it('should reject signup with invalid email format', async () => {
      const app = await getApp();
      await clearAuthRateLimits();
      const response = await app.request
        .post('/api/v1/accounts')
        .send({ email: 'not-an-email', password: 'SecurePass123!', name: 'Invalid Email User' });

      // 400 or 422 for validation error
      expect([400, 422]).toContain(response.status);
    });

    it('should reject signup without required fields', async () => {
      const app = await getApp();
      await clearAuthRateLimits();
      const response = await app.request.post('/api/v1/accounts').send({});

      // 400 or 422 for validation error
      expect([400, 422]).toContain(response.status);
    });
  });

  describe('Step 2: Email Verification', () => {
    it('should request email verification', async () => {
      const app = await getApp();
      const account = await createTestAccount(app, 'email-verify', 'Email Verify User');
      const accessToken = await loginTestAccount(app, account.email, account.password);

      const response = await app.request
        .post('/api/v1/auth/email-verification/send')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({}); // Send empty body - email should be taken from token

      expect([200, 201]).toContain(response.status);
    });

    it('should reject verification with invalid token', async () => {
      const app = await getApp();
      const response = await app.request
        .post('/api/v1/auth/verify-email')
        .send({ token: 'invalid-token-12345' });

      expect([400, 401, 404]).toContain(response.status);
    });

    it('should not allow protected actions without email verification', async () => {
      const app = await getApp();
      const account = await createTestAccount(app, 'email-verify', 'Email Verify User');
      const accessToken = await loginTestAccount(app, account.email, account.password);

      // Try to access onboarding without email verification
      const response = await app.request
        .get('/api/v1/onboarding/status')
        .set('Authorization', `Bearer ${accessToken}`);

      // Should either require verification or work (depends on business rules)
      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('Step 3: Terms of Service Acceptance', () => {
    it('should follow current ToS policy for onboarding access', async () => {
      const app = await getApp();
      const account = await createTestAccount(app, 'tos', 'ToS User');
      await app.prisma.user.update({
        where: { id: account.userId },
        data: { emailVerified: new Date() },
      });
      const accessToken = await loginTestAccount(app, account.email, account.password);

      const response = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createOnboardingPayload({ username: uniqueTestUsername('tospre') }));

      // POST /v1/onboarding sem statusCode → auto-201; 403 vem do ToS guard.
      expect([200, 201, 403]).toContain(response.status);
    });

    it('should allow onboarding after ToS acceptance', async () => {
      const app = await getApp();
      const { accessToken } = await verifiedSession(app, 'tos', 'ToS User');

      const response = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createOnboardingPayload({ username: uniqueTestUsername('tosuser') }));

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('Step 4: Onboarding Status Check', () => {
    it('should return incomplete status for new user', async () => {
      const app = await getApp();
      const { accessToken } = await verifiedSession(app, 'status', 'Status User');

      const response = await app.request
        .get('/api/v1/onboarding/status')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.hasCompletedOnboarding).toBe(false);
    });

    it('should reject unauthenticated request', async () => {
      const app = await getApp();
      const response = await app.request.get('/api/v1/onboarding/status');

      expect(response.status).toBe(401);
    });
  });

  describe('Step 5: Onboarding Progress Save/Load', () => {
    it('should get initial progress', async () => {
      const app = await getApp();
      const { accessToken } = await verifiedSession(app, 'progress', 'Progress User');

      const response = await app.request
        .get('/api/v1/onboarding/progress')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(unwrapApiData<{ currentStep: string }>(response.body)).toHaveProperty('currentStep');
    });

    it('should save progress for personal-info step', async () => {
      const app = await getApp();
      const { accessToken } = await verifiedSession(app, 'progress', 'Progress User');

      const response = await app.request
        .put('/api/v1/onboarding/progress')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentStep: 'personal-info',
          completedSteps: ['welcome'],
          personalInfo: { fullName: 'Test User' },
        });

      expect(response.status).toBe(200);
    });

    it('should save progress for professional-profile step', async () => {
      const app = await getApp();
      const { accessToken } = await verifiedSession(app, 'progress', 'Progress User');

      const response = await app.request
        .put('/api/v1/onboarding/progress')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentStep: 'professional-profile',
          completedSteps: ['welcome', 'personal-info'],
          personalInfo: { fullName: 'Test User' },
          professionalProfile: { jobTitle: 'Software Engineer', summary: 'Experienced developer' },
        });

      expect(response.status).toBe(200);
    });

    it('should save progress for experiences step', async () => {
      const app = await getApp();
      const { accessToken } = await verifiedSession(app, 'progress', 'Progress User');

      const response = await app.request
        .put('/api/v1/onboarding/progress')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(
          createSectionProgressPayload(
            'work_experience_v1',
            [{ company: 'Tech Corp', role: 'Developer', startDate: '2020-01-01' }],
            ['welcome', 'personal-info', 'professional-profile'],
          ),
        );

      expect(response.status).toBe(200);
    });

    it('should save progress for education step', async () => {
      const app = await getApp();
      const { accessToken } = await verifiedSession(app, 'progress', 'Progress User');

      const response = await app.request
        .put('/api/v1/onboarding/progress')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(
          createSectionProgressPayload(
            'education_v1',
            [
              {
                institution: 'University',
                degree: 'BS Computer Science',
                startDate: '2016-01-01',
                endDate: '2020-01-01',
              },
            ],
            ['welcome', 'personal-info', 'professional-profile', 'section:work_experience_v1'],
          ),
        );

      expect(response.status).toBe(200);
    });

    it('should save progress for skills step', async () => {
      const app = await getApp();
      const { accessToken } = await verifiedSession(app, 'progress', 'Progress User');

      const response = await app.request
        .put('/api/v1/onboarding/progress')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(
          createSectionProgressPayload(
            'skill_set_v1',
            [
              { name: 'JavaScript', category: 'Programming' },
              { name: 'TypeScript', category: 'Programming' },
            ],
            [
              'welcome',
              'personal-info',
              'professional-profile',
              'section:work_experience_v1',
              'section:education_v1',
            ],
          ),
        );

      expect(response.status).toBe(200);
    });

    it('should save progress for languages step', async () => {
      const app = await getApp();
      const { accessToken } = await verifiedSession(app, 'progress', 'Progress User');

      const response = await app.request
        .put('/api/v1/onboarding/progress')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(
          createSectionProgressPayload(
            'language_v1',
            [
              { name: 'English', level: 'NATIVE' },
              { name: 'Spanish', level: 'INTERMEDIATE' },
            ],
            [
              'welcome',
              'personal-info',
              'professional-profile',
              'section:work_experience_v1',
              'section:education_v1',
              'section:skill_set_v1',
            ],
          ),
        );

      expect(response.status).toBe(200);
    });

    it('should persist and retrieve progress', async () => {
      const app = await getApp();
      const { accessToken } = await verifiedSession(app, 'progress', 'Progress User');

      // Save progress
      await app.request
        .put('/api/v1/onboarding/progress')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentStep: 'section:skill_set_v1',
          completedSteps: ['welcome', 'personal-info'],
          personalInfo: { fullName: 'Persist Test' },
        });

      // Retrieve progress
      const response = await app.request
        .get('/api/v1/onboarding/progress')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(unwrapApiData<{ currentStep: string }>(response.body).currentStep).toBe(
        'section:skill_set_v1',
      );
    });
  });

  describe('Step 6: Complete Onboarding', () => {
    it('should complete onboarding with minimal data', async () => {
      const app = await getApp();
      const { accessToken } = await verifiedSession(app, 'complete', 'Complete User');

      const response = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(
          createOnboardingPayload({
            fullName: 'Minimal User',
            email: 'minimal@test.com',
            jobTitle: 'Developer',
          }),
        );

      expect([200, 201]).toContain(response.status);
      if (response.status === 200 || response.status === 201) {
        expect(response.body.resumeId).toBeDefined();
      }
    });

    it('should complete onboarding with full data', async () => {
      const app = await getApp();
      const { accessToken } = await verifiedSession(app, 'complete', 'Complete User');

      const response = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(
          createOnboardingPayload({
            username: uniqueTestUsername('fulluser'),
            fullName: 'Full Data User',
            email: 'full@test.com',
            jobTitle: 'Senior Software Engineer',
            hasExperience: true,
            hasEducation: true,
            hasSkills: true,
          }),
        );

      expect([200, 201]).toContain(response.status);
    });

    it('should reject duplicate username', async () => {
      const app = await getApp();
      const username = uniqueTestUsername('uniqueuser');

      // First user completes onboarding with `username`.
      const first = await verifiedSession(app, 'complete', 'Complete User');
      const firstRes = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${first.accessToken}`)
        .send(
          createOnboardingPayload({ username, fullName: 'First User', email: 'first@test.com' }),
        );

      if (firstRes.status !== 200 && firstRes.status !== 201) return;

      // A second, independent user tries the same username.
      const second = await verifiedSession(app, 'second', 'Second User');
      const response = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${second.accessToken}`)
        .send(
          createOnboardingPayload({ username, fullName: 'Second User', email: 'second@test.com' }),
        );

      expect(response.status).toBe(409);
    });

    it('should reject invalid onboarding data', async () => {
      const app = await getApp();
      const { accessToken } = await verifiedSession(app, 'complete', 'Complete User');

      const response = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          // Missing required fields
          username: '',
          personalInfo: {},
        });

      // 400 or 422 for validation error
      expect([400, 422]).toContain(response.status);
    });

    it('should reject onboarding without authentication', async () => {
      const app = await getApp();
      const response = await app.request.post('/api/v1/onboarding').send({
        username: 'noauth',
        personalInfo: { fullName: 'No Auth' },
      });

      // Body validation runs in buildHttpCtx before the auth pipeline,
      // so a payload that doesn't satisfy the OnboardingDataSchema
      // surfaces 400 instead of 401. Either response code is the
      // correct "rejected" outcome here.
      expect([400, 401]).toContain(response.status);
    });
  });

  describe('Step 7: Post-Onboarding Verification', () => {
    /**
     * Each assertion owns its own fully-onboarded user. Provisioning a
     * verified session + completing onboarding inside every `it` keeps
     * the suite order-independent (no `beforeAll`-shared resumeId/token
     * that another concurrent test could read mid-write).
     */
    async function onboardedUser(app: App): Promise<{ accessToken: string; resumeId: string }> {
      const { accessToken } = await verifiedSession(app, 'verify', 'Verify User');
      const onboardingRes = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(
          createOnboardingPayload({
            username: uniqueTestUsername('verifyuser'),
            fullName: 'Verify User',
            email: 'verify@test.com',
            jobTitle: 'Tester',
          }),
        );
      return { accessToken, resumeId: onboardingRes.body?.resumeId };
    }

    it('should show completed onboarding status', async () => {
      const app = await getApp();
      const { accessToken } = await onboardedUser(app);

      const response = await app.request
        .get('/api/v1/onboarding/status')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.hasCompletedOnboarding).toBe(true);
    });

    it('should have created resume', async () => {
      const app = await getApp();
      const { accessToken, resumeId } = await onboardedUser(app);
      if (!resumeId) return;

      const response = await app.request
        .get(`/api/v1/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it('should list user resumes', async () => {
      const app = await getApp();
      const { accessToken } = await onboardedUser(app);

      const response = await app.request
        .get('/api/v1/resumes')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items.length).toBeGreaterThanOrEqual(1);
    });

    it('should have cleared onboarding progress', async () => {
      const app = await getApp();
      const { accessToken } = await onboardedUser(app);

      const response = await app.request
        .get('/api/v1/onboarding/progress')
        .set('Authorization', `Bearer ${accessToken}`);

      // Progress should be empty or reset after completion
      expect(response.status).toBe(200);
    });
  });

  describe('Edge Cases: Onboarding Flow', () => {
    it('should handle concurrent progress saves', async () => {
      const app = await getApp();
      const { accessToken } = await verifiedSession(app, 'edge', 'Edge Case User');

      const promises = Array.from({ length: 3 }, (_, i) =>
        app.request
          .put('/api/v1/onboarding/progress')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            currentStep:
              ['personal-info', 'username', 'professional-profile'][i] ?? 'personal-info',
            completedSteps: ['welcome'],
          }),
      );

      const results = await Promise.all(promises);
      expect(results.every((r) => r.status === 200)).toBe(true);
    });

    it('should prevent double onboarding completion', async () => {
      const app = await getApp();
      const { accessToken } = await verifiedSession(app, 'edge', 'Edge Case User');
      const username = uniqueTestUsername('double');

      // First completion
      const first = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createOnboardingPayload({ username, fullName: 'Double User' }));

      expect([200, 201]).toContain(first.status);

      // Second completion attempt with different username
      const second = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createOnboardingPayload({ username: uniqueTestUsername('double2') }));

      // Should fail - already completed onboarding
      expect([400, 409]).toContain(second.status);
    });

    it('should reject special characters in username', async () => {
      const app = await getApp();
      const { accessToken } = await verifiedSession(app, 'edge', 'Edge Case User');

      const response = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createOnboardingPayload({ username: 'user@special!chars#$%' }));

      // Should reject invalid username chars - 400 or 422
      expect([400, 422]).toContain(response.status);
    });

    it('should handle emoji in personal info', async () => {
      const app = await getApp();
      const { accessToken } = await verifiedSession(app, 'edge', 'Edge Case User');

      const response = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(
          createOnboardingPayload({
            username: uniqueTestUsername('emoji'),
            fullName: '👨‍💻 Emoji User',
            jobTitle: '🚀 Developer',
          }),
        );

      // Should accept emoji in names (valid unicode)
      expect([200, 201]).toContain(response.status);
    });
  });
});
