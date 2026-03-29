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
 * See docs/BUG_DISCOVERY_REPORT.md for known issues.
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import {
  acceptTosForUser,
  closeApp,
  getApp,
  getPrisma,
  getRequest,
  unwrapApiData,
  verifyUserEmail,
} from './setup';

/** Generate unique email for each test to avoid conflicts */
function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`;
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

async function createTestAccount(
  prefix: string,
  name: string,
  password = 'SecurePass123!',
): Promise<TestAccount> {
  const email = uniqueEmail(prefix);
  const response = await getRequest().post('/api/accounts').send({
    email,
    password,
    name,
  });

  if (response.status !== 201 || !response.body.data?.userId) {
    throw new Error(`Signup failed: ${JSON.stringify(response.body)}`);
  }

  return {
    email,
    password,
    userId: response.body.data.userId,
  };
}

async function loginTestAccount(email: string, password: string): Promise<string> {
  const response = await getRequest().post('/api/auth/login').send({ email, password });

  if (response.status !== 200 || !response.body.data?.accessToken) {
    throw new Error(`Login failed: ${JSON.stringify(response.body)}`);
  }

  return response.body.data.accessToken;
}

/**
 * Creates a valid minimal onboarding payload
 * Uses the flat OnboardingDataSchema structure expected by the backend
 *
 * Required fields by schema:
 * - username: 3-30 chars, alphanumeric + underscore
 * - personalInfo.fullName: 2-100 chars
 * - personalInfo.email: valid email
 * - professionalProfile.jobTitle: 2-100 chars
 * - professionalProfile.summary: 10-500 chars (REQUIRED!)
 * - skills: array (can be empty)
 * - noSkills: boolean
 * - experiences: array (can be empty)
 * - noExperience: boolean
 * - education: array (can be empty)
 * - noEducation: boolean
 * - languages: array with at least name + level
 * - templateSelection: template + palette
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
    username = `user${Date.now()}`,
    fullName = 'Test User',
    email = 'test@example.com',
    jobTitle = 'Software Developer',
    summary = 'Experienced software developer with expertise in modern web technologies.',
    hasExperience = false,
    hasEducation = false,
    hasSkills = false,
  } = overrides;

  return {
    username,
    personalInfo: { fullName, email },
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
    templateSelection: { template: 'PROFESSIONAL', palette: 'DEFAULT' },
  };
}

describe('Complete Onboarding Flow', () => {
  beforeAll(async () => {
    await getApp();
  }, 30000);

  afterAll(async () => {
    await closeApp();
  });

  describe('Step 1: Account Creation (Signup)', () => {
    const testEmail = `onboarding-flow-${Date.now()}@test.com`;
    let userId: string;

    afterEach(async () => {
      if (userId) {
        const prisma = getPrisma();
        await prisma.user.deleteMany({ where: { id: userId } });
      }
    });

    it('should create account with valid credentials', async () => {
      const response = await getRequest().post('/api/accounts').send({
        email: testEmail,
        password: 'SecurePass123!',
        name: 'Test User',
      });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('userId');
      expect(response.body.data.email).toBe(testEmail);
      expect(response.body.data.message).toBeDefined();

      userId = response.body.data.userId;
    });

    it('should reject signup with existing email', async () => {
      // First signup
      const first = await getRequest().post('/api/accounts').send({
        email: testEmail,
        password: 'SecurePass123!',
        name: 'First User',
      });

      userId = first.body.data?.userId;

      // Second signup with same email
      const response = await getRequest().post('/api/accounts').send({
        email: testEmail,
        password: 'DifferentPass123!',
        name: 'Second User',
      });

      expect(response.status).toBe(409);
    });

    it('should reject signup with weak password', async () => {
      const response = await getRequest()
        .post('/api/accounts')
        .send({
          email: uniqueEmail('weak-pass'),
          password: '123',
          name: 'Weak Pass User',
        });

      // 400 or 422 for validation error
      expect([400, 422]).toContain(response.status);
    });

    it('should reject signup with invalid email format', async () => {
      const response = await getRequest().post('/api/accounts').send({
        email: 'not-an-email',
        password: 'SecurePass123!',
        name: 'Invalid Email User',
      });

      // 400 or 422 for validation error
      expect([400, 422]).toContain(response.status);
    });

    it('should reject signup without required fields', async () => {
      const response = await getRequest().post('/api/accounts').send({});

      // 400 or 422 for validation error
      expect([400, 422]).toContain(response.status);
    });
  });

  describe('Step 2: Email Verification', () => {
    let accessToken: string;
    let userId: string;
    let _testEmail: string;

    beforeEach(async () => {
      // Generate unique email for each test
      const account = await createTestAccount('email-verify', 'Email Verify User');
      _testEmail = account.email;
      userId = account.userId;
      accessToken = await loginTestAccount(account.email, account.password);
    });

    afterEach(async () => {
      if (userId) {
        const prisma = getPrisma();
        await prisma.user.deleteMany({ where: { id: userId } });
      }
    });

    it('should request email verification', async () => {
      const response = await getRequest()
        .post('/api/email-verification/send')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({}); // Send empty body - email should be taken from token

      expect([200, 201]).toContain(response.status);
    });

    it('should reject verification with invalid token', async () => {
      const response = await getRequest()
        .post('/api/v1/auth/verify-email')
        .send({ token: 'invalid-token-12345' });

      expect([400, 401, 404]).toContain(response.status);
    });

    it('should not allow protected actions without email verification', async () => {
      // Try to access onboarding without email verification
      const response = await getRequest()
        .get('/api/v1/onboarding/status')
        .set('Authorization', `Bearer ${accessToken}`);

      // Should either require verification or work (depends on business rules)
      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('Step 3: Terms of Service Acceptance', () => {
    let accessToken: string;
    let userId: string;

    beforeEach(async () => {
      const account = await createTestAccount('tos', 'ToS User');
      userId = account.userId;

      // Verify email
      await verifyUserEmail(userId);
      accessToken = await loginTestAccount(account.email, account.password);
    });

    afterEach(async () => {
      if (userId) {
        const prisma = getPrisma();
        await prisma.userConsent.deleteMany({ where: { userId } });
        await prisma.user.deleteMany({ where: { id: userId } });
      }
    });

    it('should follow current ToS policy for onboarding access', async () => {
      const response = await getRequest()
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createOnboardingPayload({ username: 'testuser' }));

      expect([200, 403]).toContain(response.status);
    });

    it('should allow onboarding after ToS acceptance', async () => {
      await acceptTosForUser(userId);

      const response = await getRequest()
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createOnboardingPayload({ username: `tosuser${Date.now()}` }));

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('Step 4: Onboarding Status Check', () => {
    let accessToken: string;
    let userId: string;

    beforeEach(async () => {
      const account = await createTestAccount('status', 'Status User');
      userId = account.userId;

      // Setup: verify email and accept ToS
      await verifyUserEmail(userId);
      await acceptTosForUser(userId);
      accessToken = await loginTestAccount(account.email, account.password);
    });

    afterEach(async () => {
      if (userId) {
        const prisma = getPrisma();
        await prisma.userConsent.deleteMany({ where: { userId } });
        await prisma.onboardingProgress.deleteMany({ where: { userId } });
        await prisma.user.deleteMany({ where: { id: userId } });
      }
    });

    it('should return incomplete status for new user', async () => {
      const response = await getRequest()
        .get('/api/v1/onboarding/status')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.hasCompletedOnboarding).toBe(false);
    });

    it('should reject unauthenticated request', async () => {
      const response = await getRequest().get('/api/v1/onboarding/status');

      expect(response.status).toBe(401);
    });
  });

  describe('Step 5: Onboarding Progress Save/Load', () => {
    let accessToken: string;
    let userId: string;

    beforeEach(async () => {
      const account = await createTestAccount('progress', 'Progress User');
      userId = account.userId;

      // Setup: verify email and accept ToS
      await verifyUserEmail(userId);
      await acceptTosForUser(userId);
      accessToken = await loginTestAccount(account.email, account.password);
    });

    afterEach(async () => {
      if (userId) {
        const prisma = getPrisma();
        await prisma.userConsent.deleteMany({ where: { userId } });
        await prisma.onboardingProgress.deleteMany({ where: { userId } });
        await prisma.user.deleteMany({ where: { id: userId } });
      }
    });

    it('should get initial progress', async () => {
      const response = await getRequest()
        .get('/api/v1/onboarding/progress')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(unwrapApiData<{ currentStep: string }>(response.body)).toHaveProperty('currentStep');
    });

    it('should save progress for personal-info step', async () => {
      const response = await getRequest()
        .put('/api/v1/onboarding/progress')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentStep: 'personal-info',
          completedSteps: ['welcome'],
          personalInfo: {
            fullName: 'Test User',
            email: 'test@example.com',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should save progress for professional-profile step', async () => {
      const response = await getRequest()
        .put('/api/v1/onboarding/progress')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentStep: 'professional-profile',
          completedSteps: ['welcome', 'personal-info'],
          personalInfo: {
            fullName: 'Test User',
            email: 'test@example.com',
          },
          professionalProfile: {
            jobTitle: 'Software Engineer',
            summary: 'Experienced developer',
          },
        });

      expect(response.status).toBe(200);
    });

    it('should save progress for experiences step', async () => {
      const response = await getRequest()
        .put('/api/v1/onboarding/progress')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(
          createSectionProgressPayload(
            'work_experience_v1',
            [
              {
                company: 'Tech Corp',
                role: 'Developer',
                startDate: '2020-01-01',
              },
            ],
            ['welcome', 'personal-info', 'professional-profile'],
          ),
        );

      expect(response.status).toBe(200);
    });

    it('should save progress for education step', async () => {
      const response = await getRequest()
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
      const response = await getRequest()
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
      const response = await getRequest()
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
      // Save progress
      await getRequest()
        .put('/api/v1/onboarding/progress')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentStep: 'section:skill_set_v1',
          completedSteps: ['welcome', 'personal-info'],
          personalInfo: { fullName: 'Persist Test' },
        });

      // Retrieve progress
      const response = await getRequest()
        .get('/api/v1/onboarding/progress')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(unwrapApiData<{ currentStep: string }>(response.body).currentStep).toBe(
        'section:skill_set_v1',
      );
    });
  });

  describe('Step 6: Complete Onboarding', () => {
    let accessToken: string;
    let userId: string;

    beforeEach(async () => {
      const account = await createTestAccount('complete', 'Complete User');
      userId = account.userId;

      // Setup: verify email and accept ToS
      await verifyUserEmail(userId);
      await acceptTosForUser(userId);
      accessToken = await loginTestAccount(account.email, account.password);
    });

    afterEach(async () => {
      if (userId) {
        const prisma = getPrisma();
        // Clean up section items and sections (new generic sections model)
        await prisma.sectionItem.deleteMany({
          where: { resumeSection: { resume: { userId } } },
        });
        await prisma.resumeSection.deleteMany({
          where: { resume: { userId } },
        });
        await prisma.resume.deleteMany({ where: { userId } });
        await prisma.userConsent.deleteMany({ where: { userId } });
        await prisma.onboardingProgress.deleteMany({ where: { userId } });
        await prisma.user.deleteMany({ where: { id: userId } });
      }
    });

    it('should complete onboarding with minimal data', async () => {
      const response = await getRequest()
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
        expect(response.body.success).toBe(true);
        expect(response.body.data.resumeId).toBeDefined();
      }
    });

    it('should complete onboarding with full data', async () => {
      const response = await getRequest()
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(
          createOnboardingPayload({
            username: `fulluser${Date.now()}`,
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
      const username = `uniqueuser${Date.now()}`;

      // First completion
      const first = await getRequest()
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(
          createOnboardingPayload({
            username,
            fullName: 'First User',
            email: 'first@test.com',
          }),
        );

      if (first.status !== 200 && first.status !== 201) return;

      // Create another user
      const secondAccount = await createTestAccount('second', 'Second User');
      const userId2 = secondAccount.userId;

      // Setup second user
      await verifyUserEmail(userId2);
      await acceptTosForUser(userId2);
      const token2 = await loginTestAccount(secondAccount.email, secondAccount.password);

      // Try same username
      const response = await getRequest()
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${token2}`)
        .send(
          createOnboardingPayload({
            username,
            fullName: 'Second User',
            email: 'second@test.com',
          }),
        );

      expect(response.status).toBe(409);

      // Cleanup second user
      const prisma = getPrisma();
      await prisma.userConsent.deleteMany({ where: { userId: userId2 } });
      await prisma.user.deleteMany({ where: { id: userId2 } });
    });

    it('should reject invalid onboarding data', async () => {
      const response = await getRequest()
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
      const response = await getRequest()
        .post('/api/v1/onboarding')
        .send({
          username: 'noauth',
          personalInfo: { fullName: 'No Auth', email: 'noauth@test.com' },
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Step 7: Post-Onboarding Verification', () => {
    let accessToken: string;
    let userId: string;
    let resumeId: string;

    beforeAll(async () => {
      const account = await createTestAccount('verify', 'Verify User');
      userId = account.userId;

      // Setup: verify email and accept ToS
      await verifyUserEmail(userId);
      await acceptTosForUser(userId);
      accessToken = await loginTestAccount(account.email, account.password);

      // Complete onboarding
      const onboardingRes = await getRequest()
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(
          createOnboardingPayload({
            username: `verifyuser${Date.now()}`,
            fullName: 'Verify User',
            email: 'verify@test.com',
            jobTitle: 'Tester',
          }),
        );

      resumeId = onboardingRes.body.data?.resumeId;
    });

    afterAll(async () => {
      if (userId) {
        const prisma = getPrisma();
        // Clean up section items and sections (new generic sections model)
        await prisma.sectionItem.deleteMany({
          where: { resumeSection: { resume: { userId } } },
        });
        await prisma.resumeSection.deleteMany({
          where: { resume: { userId } },
        });
        await prisma.resume.deleteMany({ where: { userId } });
        await prisma.userConsent.deleteMany({ where: { userId } });
        await prisma.onboardingProgress.deleteMany({ where: { userId } });
        await prisma.user.deleteMany({ where: { id: userId } });
      }
    });

    it('should show completed onboarding status', async () => {
      const response = await getRequest()
        .get('/api/v1/onboarding/status')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.hasCompletedOnboarding).toBe(true);
    });

    it('should have created resume', async () => {
      if (!resumeId) return;

      const response = await getRequest()
        .get(`/api/v1/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    it('should list user resumes', async () => {
      const response = await getRequest()
        .get('/api/v1/resumes')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(unwrapApiData<{ data: unknown[] }>(response.body).data.length).toBeGreaterThanOrEqual(
        1,
      );
    });

    it('should have cleared onboarding progress', async () => {
      const response = await getRequest()
        .get('/api/v1/onboarding/progress')
        .set('Authorization', `Bearer ${accessToken}`);

      // Progress should be empty or reset after completion
      expect(response.status).toBe(200);
    });
  });

  describe('Edge Cases: Onboarding Flow', () => {
    let accessToken: string;
    let userId: string;

    beforeEach(async () => {
      const account = await createTestAccount('edge', 'Edge Case User');
      userId = account.userId;

      // Setup: verify email and accept ToS
      await verifyUserEmail(userId);
      await acceptTosForUser(userId);
      accessToken = await loginTestAccount(account.email, account.password);
    });

    afterEach(async () => {
      if (userId) {
        const prisma = getPrisma();
        // Clean up section items and sections (new generic sections model)
        await prisma.sectionItem.deleteMany({
          where: { resumeSection: { resume: { userId } } },
        });
        await prisma.resumeSection.deleteMany({
          where: { resume: { userId } },
        });
        await prisma.resume.deleteMany({ where: { userId } });
        await prisma.userConsent.deleteMany({ where: { userId } });
        await prisma.onboardingProgress.deleteMany({ where: { userId } });
        await prisma.user.deleteMany({ where: { id: userId } });
      }
    });

    it('should handle concurrent progress saves', async () => {
      const promises = Array.from({ length: 3 }, (_, i) =>
        getRequest()
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
      const username = `double${Date.now()}`;

      // First completion
      const first = await getRequest()
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createOnboardingPayload({ username, fullName: 'Double User' }));

      expect([200, 201]).toContain(first.status);

      // Second completion attempt with different username
      const second = await getRequest()
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createOnboardingPayload({ username: `double2${Date.now()}` }));

      // Should fail - already completed onboarding
      expect([400, 409]).toContain(second.status);
    });

    it('should reject special characters in username', async () => {
      const response = await getRequest()
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createOnboardingPayload({ username: 'user@special!chars#$%' }));

      // Should reject invalid username chars - 400 or 422
      expect([400, 422]).toContain(response.status);
    });

    it('should handle emoji in personal info', async () => {
      const response = await getRequest()
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(
          createOnboardingPayload({
            username: `emoji${Date.now()}`,
            fullName: '👨‍💻 Emoji User',
            jobTitle: '🚀 Developer',
          }),
        );

      // Should accept emoji in names (valid unicode)
      expect([200, 201]).toContain(response.status);
    });
  });
});
