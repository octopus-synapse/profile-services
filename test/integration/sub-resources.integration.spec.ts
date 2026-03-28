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
 *
 * IMPORTANT: Payloads must match the field definitions in section-type.seed.ts
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
    // Required: company, role, startDate
    createPayload: {
      company: 'Test Company',
      role: 'Software Engineer',
      startDate: '2020-01-01',
      description: 'Test experience description',
    },
    updatePayload: {
      company: 'Test Company',
      role: 'Senior Software Engineer',
      startDate: '2020-01-01',
    },
  },
  {
    name: 'education',
    sectionTypeKey: 'education_v1',
    // Required: institution, degree
    createPayload: {
      institution: 'Test University',
      degree: 'Bachelor',
      field: 'Computer Science',
      startDate: '2016-01-01',
      endDate: '2020-01-01',
    },
    updatePayload: {
      institution: 'Test University',
      degree: 'Master',
    },
  },
  {
    name: 'skills',
    sectionTypeKey: 'skill_set_v1',
    // Required: name
    createPayload: {
      name: 'TypeScript',
      category: 'Programming Languages',
    },
    updatePayload: {
      name: 'TypeScript',
      category: 'Backend',
    },
  },
  {
    name: 'projects',
    sectionTypeKey: 'project_v1',
    // Required: name
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
    // Required: name, issuer, issueDate
    createPayload: {
      name: 'AWS Certified',
      issuer: 'Amazon',
      issueDate: '2023-01-01',
    },
    updatePayload: {
      name: 'AWS Certified Solutions Architect',
      issuer: 'Amazon',
      issueDate: '2023-01-01',
    },
  },
  {
    name: 'awards',
    sectionTypeKey: 'award_v1',
    // Required: title, issuer, date
    createPayload: {
      title: 'Best Developer Award',
      issuer: 'Tech Company',
      date: '2023-06-01',
    },
    updatePayload: {
      title: 'Outstanding Developer Award',
      issuer: 'Tech Company',
      date: '2023-06-01',
    },
  },
  {
    name: 'publications',
    sectionTypeKey: 'publication_v1',
    // Required: title, publisher, date
    createPayload: {
      title: 'Test Publication',
      publisher: 'Tech Journal',
      date: '2023-01-01',
    },
    updatePayload: {
      title: 'Updated Test Publication',
      publisher: 'Tech Journal',
      date: '2023-01-01',
    },
  },
  {
    name: 'talks',
    sectionTypeKey: 'talk_v1',
    // Required: title, event, date
    createPayload: {
      title: 'Test Conference Talk',
      event: 'Tech Conference 2023',
      date: '2023-06-15',
    },
    updatePayload: {
      title: 'Updated Conference Talk',
      event: 'Tech Conference 2023',
      date: '2023-06-15',
    },
  },
  {
    name: 'hackathons',
    sectionTypeKey: 'hackathon_v1',
    // Required: name, date
    createPayload: {
      name: 'Test Hackathon',
      date: '2023-03-01',
      organizer: 'Tech Corp',
      projectName: 'Test Project',
    },
    updatePayload: {
      name: 'Test Hackathon',
      date: '2023-03-01',
      projectName: 'Updated Test Project',
    },
  },
  {
    name: 'languages',
    sectionTypeKey: 'language_v1',
    // Required: name, level (enum: BASIC, INTERMEDIATE, FLUENT, NATIVE)
    createPayload: {
      name: 'English',
      level: 'NATIVE',
    },
    updatePayload: {
      name: 'English',
      level: 'FLUENT',
    },
  },
  {
    name: 'interests',
    sectionTypeKey: 'interest_v1',
    // Required: name
    createPayload: {
      name: 'Open Source',
      keywords: ['software', 'community'],
    },
    updatePayload: {
      name: 'Open Source',
      keywords: ['software', 'community', 'collaboration'],
    },
  },
  {
    name: 'recommendations',
    sectionTypeKey: 'recommendation_v1',
    // Required: name
    createPayload: {
      name: 'John Doe',
      role: 'CTO',
      company: 'Tech Corp',
      text: 'Great developer!',
    },
    updatePayload: {
      name: 'John Doe',
      text: 'Outstanding developer and team player!',
    },
  },
  {
    name: 'achievements',
    sectionTypeKey: 'achievement_v1',
    // Required: title
    createPayload: {
      title: 'Test Achievement',
      description: 'Achieved something great',
      date: '2023-01-01',
    },
    updatePayload: {
      title: 'Outstanding Achievement',
    },
  },
  {
    name: 'bug bounties',
    sectionTypeKey: 'bug_bounty_v1',
    // Required: platform, date
    createPayload: {
      platform: 'HackerOne',
      date: '2023-01-01',
      severity: 'High',
      description: 'SQL Injection vulnerability',
      reward: '1000',
    },
    updatePayload: {
      platform: 'HackerOne',
      date: '2023-01-01',
      reward: '2000',
    },
  },
  {
    name: 'open source',
    sectionTypeKey: 'open_source_v1',
    // Required: projectName, role (enum: Maintainer, Contributor, Creator)
    createPayload: {
      projectName: 'Test OSS Project',
      role: 'Maintainer',
      description: 'Open source contribution',
      url: 'https://github.com/test/project',
    },
    updatePayload: {
      projectName: 'Test OSS Project',
      role: 'Creator',
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

      // Log response for debugging if it fails
      if (![200, 201].includes(res.status)) {
        console.error(`CREATE ${name} failed:`, res.status, JSON.stringify(res.body, null, 2));
      }

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

      // Find the section for this type (structure is sectionType.key)
      const section = res.body.data.sections.find(
        (s: { sectionType: { key: string } }) => s.sectionType?.key === sectionTypeKey,
      );

      // Log for debugging if section not found
      if (!section) {
        console.error(
          `Section ${sectionTypeKey} not found. Available sections:`,
          res.body.data.sections.map((s: { sectionType: { key: string } }) => s.sectionType?.key),
        );
      }

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

      // Log response for debugging if it fails
      if (res.status !== 200) {
        console.error(`UPDATE ${name} failed:`, res.status, JSON.stringify(res.body, null, 2));
      }

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
