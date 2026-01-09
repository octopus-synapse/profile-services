import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import {
  getRequest,
  getApp,
  closeApp,
  testContext,
  createTestUserAndLogin,
  authHeader,
} from './setup';

/**
 * Sub-resource configuration for parametrized tests
 */
interface SubResourceConfig {
  name: string;
  endpoint: string;
  createPayload: Record<string, unknown>;
  updatePayload: Record<string, unknown>;
}

const SUB_RESOURCES: SubResourceConfig[] = [
  {
    name: 'experiences',
    endpoint: 'experiences',
    createPayload: {
      company: 'Test Company',
      position: 'Software Engineer',
      startDate: '2020-01-01',
      current: true,
      description: 'Test experience description',
    },
    updatePayload: {
      position: 'Senior Software Engineer',
    },
  },
  {
    name: 'education',
    endpoint: 'education',
    createPayload: {
      institution: 'Test University',
      degree: 'Bachelor',
      field: 'Computer Science',
      startDate: '2016-01-01',
      endDate: '2020-01-01',
    },
    updatePayload: {
      degree: 'Master',
    },
  },
  {
    name: 'skills',
    endpoint: 'skills',
    createPayload: {
      name: 'TypeScript',
      level: 4,
      category: 'Programming Languages',
    },
    updatePayload: {
      level: 5,
    },
  },
  {
    name: 'projects',
    endpoint: 'projects',
    createPayload: {
      name: 'Test Project',
      description: 'A test project',
      technologies: ['TypeScript', 'NestJS'],
    },
    updatePayload: {
      name: 'Updated Test Project',
    },
  },
  {
    name: 'certifications',
    endpoint: 'certifications',
    createPayload: {
      name: 'AWS Certified',
      issuer: 'Amazon',
      issueDate: '2023-01-01',
    },
    updatePayload: {
      name: 'AWS Certified Solutions Architect',
    },
  },
  {
    name: 'awards',
    endpoint: 'awards',
    createPayload: {
      title: 'Best Developer Award',
      issuer: 'Tech Company',
      date: '2023-06-01',
    },
    updatePayload: {
      title: 'Outstanding Developer Award',
    },
  },
  {
    name: 'publications',
    endpoint: 'publications',
    createPayload: {
      title: 'Test Publication',
      publisher: 'Tech Journal',
      publicationType: 'Article',
      publishedAt: '2023-01-01',
    },
    updatePayload: {
      title: 'Updated Test Publication',
    },
  },
  {
    name: 'talks',
    endpoint: 'talks',
    createPayload: {
      title: 'Test Conference Talk',
      event: 'Tech Conference 2023',
      eventType: 'Conference',
      date: '2023-06-15',
    },
    updatePayload: {
      title: 'Updated Conference Talk',
    },
  },
  {
    name: 'hackathons',
    endpoint: 'hackathons',
    createPayload: {
      name: 'Test Hackathon',
      organizer: 'Tech Corp',
      projectName: 'Test Project',
      date: '2023-03-01',
    },
    updatePayload: {
      projectName: 'Updated Test Project',
    },
  },
  {
    name: 'languages',
    endpoint: 'languages',
    createPayload: {
      name: 'English',
      level: 'Native',
    },
    updatePayload: {
      level: 'Fluent',
    },
  },
  {
    name: 'interests',
    endpoint: 'interests',
    createPayload: {
      name: 'Open Source',
      description: 'Contributing to open source projects',
    },
    updatePayload: {
      description: 'Active open source contributor',
    },
  },
  {
    name: 'recommendations',
    endpoint: 'recommendations',
    createPayload: {
      author: 'John Doe',
      position: 'CTO',
      company: 'Tech Corp',
      content: 'Great developer!',
    },
    updatePayload: {
      content: 'Outstanding developer and team player!',
    },
  },
  {
    name: 'achievements',
    endpoint: 'achievements',
    createPayload: {
      type: 'Award',
      title: 'Test Achievement',
      description: 'Achieved something great',
      achievedAt: '2023-01-01',
    },
    updatePayload: {
      title: 'Outstanding Achievement',
    },
  },
  {
    name: 'bug-bounties',
    endpoint: 'bug-bounties',
    createPayload: {
      platform: 'HackerOne',
      company: 'Tech Corp',
      severity: 'High',
      vulnerabilityType: 'SQL Injection',
      reward: 1000,
      reportedAt: '2023-01-01',
    },
    updatePayload: {
      reward: 2000,
    },
  },
  {
    name: 'open-source',
    endpoint: 'open-sources',
    createPayload: {
      projectName: 'Test OSS Project',
      projectUrl: 'https://github.com/test/project',
      role: 'Maintainer',
      description: 'Open source contribution',
      startDate: '2023-01-01',
    },
    updatePayload: {
      role: 'Core Maintainer',
    },
  },
];

describe('Sub-Resources Smoke Tests', () => {
  let resumeId: string;
  let accessToken: string;

  beforeAll(async () => {
    await getApp();
    // Use a suite-local token to avoid races with other integration files mutating testContext
    const login = await createTestUserAndLogin();
    accessToken = login.accessToken;

    // Create a resume for testing sub-resources
    const res = await getRequest()
      .post('/api/v1/resumes')
      .set(authHeader(accessToken))
      .send({
        title: 'Sub-Resources Test Resume',
      });

    if (res.status !== 201) {
      throw new Error(`Failed to create resume: ${JSON.stringify(res.body)}`);
    }

    resumeId = res.body.data.id;
    testContext.resumeId = resumeId;
  });

  afterAll(async () => {
    await closeApp();
  });

  describe.each(SUB_RESOURCES)(
    '$name CRUD operations',
    ({ name, endpoint, createPayload, updatePayload }) => {
      let itemId: string;

      it(`POST /api/resumes/:id/${endpoint} - should create ${name}`, async () => {
        const res = await getRequest()
          .post(`/api/v1/resumes/${resumeId}/${endpoint}`)
          .set(authHeader(accessToken))
          .send(createPayload);

        // Accept both 200 and 201 as success
        expect([200, 201].includes(res.status)).toBe(true);
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('id');

        itemId = res.body.data.id;
      });

      it(`GET /api/resumes/:id/${endpoint} - should list ${name}`, async () => {
        const res = await getRequest()
          .get(`/api/v1/resumes/${resumeId}/${endpoint}`)
          .set(authHeader(accessToken));

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it(`GET /api/resumes/:id/${endpoint}/:itemId - should get single ${name}`, async () => {
        if (!itemId) {
          console.warn(`Skipping single ${name} test - no item created`);
          return;
        }

        const res = await getRequest()
          .get(`/api/v1/resumes/${resumeId}/${endpoint}/${itemId}`)
          .set(authHeader(accessToken));

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
        expect(res.body.data.id).toBe(itemId);
      });

      it(`PATCH /api/resumes/:id/${endpoint}/:itemId - should update ${name}`, async () => {
        if (!itemId) {
          console.warn(`Skipping update ${name} test - no item created`);
          return;
        }

        const res = await getRequest()
          .patch(`/api/v1/resumes/${resumeId}/${endpoint}/${itemId}`)
          .set(authHeader(accessToken))
          .send(updatePayload);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
      });

      it(`DELETE /api/resumes/:id/${endpoint}/:itemId - should delete ${name}`, async () => {
        if (!itemId) {
          console.warn(`Skipping delete ${name} test - no item created`);
          return;
        }

        const res = await getRequest()
          .delete(`/api/v1/resumes/${resumeId}/${endpoint}/${itemId}`)
          .set(authHeader(accessToken));

        expect(res.status).toBe(200);
      });
    },
  );

  describe('Authorization checks', () => {
    it('should reject sub-resource access without auth', async () => {
      const res = await getRequest().get(
        `/api/v1/resumes/${resumeId}/experiences`,
      );

      expect(res.status).toBe(401);
    });

    it('should reject sub-resource access for other user resume', async () => {
      const fakeResumeId = '00000000-0000-0000-0000-000000000000';
      const res = await getRequest()
        .get(`/api/v1/resumes/${fakeResumeId}/experiences`)
        .set(authHeader(accessToken));

      // Could be 400 (validation), 403 (forbidden) or 404 (not found)
      expect([400, 403, 404].includes(res.status)).toBe(true);
    });
  });
});
