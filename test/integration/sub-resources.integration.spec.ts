import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import {
  authHeader,
  closeApp,
  createTestUserAndLogin,
  getApp,
  getRequest,
  testContext,
} from './setup';

/**
 * Generic Section configuration for parametrized tests
 * Uses the new generic sections API pattern: /sections/:sectionTypeKey/items
 */
interface SectionConfig {
  name: string;
  sectionTypeKey: string;
  createPayload: Record<string, unknown>;
  updatePayload: Record<string, unknown>;
}

const SECTION_TYPES: SectionConfig[] = [
  {
    name: 'work experience',
    sectionTypeKey: 'work_experience_v1',
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
    sectionTypeKey: 'education_v1',
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
    sectionTypeKey: 'skill_set_v1',
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
    sectionTypeKey: 'project_v1',
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
    sectionTypeKey: 'certification_v1',
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
    sectionTypeKey: 'award_v1',
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
    sectionTypeKey: 'publication_v1',
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
    sectionTypeKey: 'talk_v1',
    createPayload: {
      title: 'Test Conference Talk',
      event: 'Tech Conference 2023',
      eventType: 'conference',
      date: '2023-06-15',
    },
    updatePayload: {
      title: 'Updated Conference Talk',
    },
  },
  {
    name: 'hackathons',
    sectionTypeKey: 'hackathon_v1',
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
    sectionTypeKey: 'language_v1',
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
    sectionTypeKey: 'interest_v1',
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
    sectionTypeKey: 'recommendation_v1',
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
    sectionTypeKey: 'achievement_v1',
    createPayload: {
      type: 'custom',
      title: 'Test Achievement',
      description: 'Achieved something great',
      achievedAt: '2023-01-01',
    },
    updatePayload: {
      title: 'Outstanding Achievement',
    },
  },
  {
    name: 'bug bounties',
    sectionTypeKey: 'bug_bounty_v1',
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
    name: 'open source',
    sectionTypeKey: 'open_source_v1',
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

describe('Generic Sections Smoke Tests', () => {
  let resumeId: string;
  let accessToken: string;

  beforeAll(async () => {
    await getApp();
    // Use a suite-local token to avoid races with other integration files mutating testContext
    const login = await createTestUserAndLogin();
    accessToken = login.accessToken;

    // Create a resume for testing sections
    const res = await getRequest().post('/api/v1/resumes').set(authHeader(accessToken)).send({
      title: 'Generic Sections Test Resume',
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

  describe('Section Types', () => {
    it('GET /api/v1/resumes/:id/sections/types - should list section types', async () => {
      const res = await getRequest()
        .get(`/api/v1/resumes/${resumeId}/sections/types`)
        .set(authHeader(accessToken));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('sectionTypes');
      expect(Array.isArray(res.body.data.sectionTypes)).toBe(true);
      expect(res.body.data.sectionTypes.length).toBeGreaterThan(0);
    });

    it('GET /api/v1/resumes/:id/sections - should list resume sections', async () => {
      const res = await getRequest()
        .get(`/api/v1/resumes/${resumeId}/sections`)
        .set(authHeader(accessToken));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('sections');
      expect(Array.isArray(res.body.data.sections)).toBe(true);
    });
  });

  describe.each(SECTION_TYPES)('$name CRUD operations', ({
    name,
    sectionTypeKey,
    createPayload,
    updatePayload,
  }) => {
    let itemId: string;

    it(`POST /sections/${sectionTypeKey}/items - should create ${name}`, async () => {
      const res = await getRequest()
        .post(`/api/v1/resumes/${resumeId}/sections/${sectionTypeKey}/items`)
        .set(authHeader(accessToken))
        .send({ content: createPayload });

      // Accept both 200 and 201 as success
      expect([200, 201].includes(res.status)).toBe(true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('item');
      expect(res.body.data.item).toHaveProperty('id');

      itemId = res.body.data.item.id;
    });

    it(`GET /sections - should include ${name} in list`, async () => {
      const res = await getRequest()
        .get(`/api/v1/resumes/${resumeId}/sections`)
        .set(authHeader(accessToken));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('sections');

      // Find the section for this type
      const section = res.body.data.sections.find(
        (s: { sectionTypeKey: string }) => s.sectionTypeKey === sectionTypeKey,
      );
      expect(section).toBeDefined();
      expect(section.items.length).toBeGreaterThan(0);
    });

    it(`PATCH /sections/${sectionTypeKey}/items/:itemId - should update ${name}`, async () => {
      if (!itemId) {
        console.warn(`Skipping update ${name} test - no item created`);
        return;
      }

      const res = await getRequest()
        .patch(`/api/v1/resumes/${resumeId}/sections/${sectionTypeKey}/items/${itemId}`)
        .set(authHeader(accessToken))
        .send({ content: updatePayload });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('item');
    });

    it(`DELETE /sections/${sectionTypeKey}/items/:itemId - should delete ${name}`, async () => {
      if (!itemId) {
        console.warn(`Skipping delete ${name} test - no item created`);
        return;
      }

      const res = await getRequest()
        .delete(`/api/v1/resumes/${resumeId}/sections/${sectionTypeKey}/items/${itemId}`)
        .set(authHeader(accessToken));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('deleted', true);
    });
  });

  describe('Authorization checks', () => {
    it('should reject section access without auth', async () => {
      const res = await getRequest().get(`/api/v1/resumes/${resumeId}/sections`);

      expect(res.status).toBe(401);
    });

    it('should reject section access for other user resume', async () => {
      const fakeResumeId = '00000000-0000-0000-0000-000000000000';
      const res = await getRequest()
        .get(`/api/v1/resumes/${fakeResumeId}/sections`)
        .set(authHeader(accessToken));

      // Could be 400 (validation), 403 (forbidden) or 404 (not found)
      expect([400, 403, 404].includes(res.status)).toBe(true);
    });
  });
});
