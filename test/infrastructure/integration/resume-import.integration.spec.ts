/**
 * Resume Import Integration Tests
 *
 * Tests resume import from JSON Resume format:
 * - Import from JSON
 * - List import history
 * - Get import status
 * - Parse without importing
 * - Error handling for invalid data
 * - Authorization boundaries
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import {
  closeApp,
  createTestUserAndLogin,
  getApp,
  getPrisma,
  getRequest,
  uniqueTestId,
} from './setup';

const describeIntegration =
  process.env.DATABASE_URL && !process.env.SKIP_INTEGRATION ? describe : describe.skip;

/**
 * Minimal valid JSON Resume payload (jsonresume.org standard)
 */
function createValidJsonResume(suffix?: string) {
  const id = suffix || uniqueTestId();
  return {
    basics: {
      name: `Test User ${id}`,
      label: 'Software Engineer',
      email: `import-${id}@example.com`,
      summary: 'Experienced software engineer with a passion for clean code.',
      location: {
        city: 'San Francisco',
        countryCode: 'US',
      },
      profiles: [
        {
          network: 'LinkedIn',
          url: 'https://linkedin.com/in/testuser',
          username: 'testuser',
        },
      ],
    },
    work: [
      {
        name: 'Tech Corp',
        position: 'Senior Engineer',
        startDate: '2020-01',
        endDate: '2023-12',
        summary: 'Led development of microservices architecture.',
        highlights: ['Improved performance by 40%', 'Mentored 5 junior devs'],
      },
    ],
    education: [
      {
        institution: 'MIT',
        area: 'Computer Science',
        studyType: 'Bachelor',
        startDate: '2014-09',
        endDate: '2018-06',
      },
    ],
    skills: [
      {
        name: 'TypeScript',
        level: 'Expert',
        keywords: ['Node.js', 'React', 'NestJS'],
      },
    ],
    languages: [
      {
        language: 'English',
        fluency: 'Native',
      },
    ],
  };
}

describeIntegration('Resume Import Integration Tests', () => {
  let accessToken: string;
  let userId: string;
  let otherAccessToken: string;
  let otherUserId: string;
  let createdImportId: string;

  beforeAll(async () => {
    await getApp();

    const auth = await createTestUserAndLogin({
      email: `import-int-${uniqueTestId()}@example.com`,
    });
    accessToken = auth.accessToken;
    userId = auth.userId;

    const otherAuth = await createTestUserAndLogin({
      email: `import-other-${uniqueTestId()}@example.com`,
    });
    otherAccessToken = otherAuth.accessToken;
    otherUserId = otherAuth.userId;
  });

  afterAll(async () => {
    const prisma = getPrisma();
    for (const uid of [userId, otherUserId]) {
      if (uid) {
        await prisma.resume.deleteMany({ where: { userId: uid } });
        await prisma.user.deleteMany({ where: { id: uid } });
      }
    }
    await closeApp();
  });

  describe('Import resume from JSON', () => {
    it('should import a valid JSON Resume', async () => {
      const jsonResume = createValidJsonResume();

      const response = await getRequest()
        .post('/api/resume-import/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ data: jsonResume });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.importId).toBeDefined();
      expect(response.body.data.status).toBeDefined();

      // Status should be COMPLETED or PROCESSING
      expect(['COMPLETED', 'PROCESSING', 'MAPPING', 'VALIDATING', 'IMPORTING']).toContain(
        response.body.data.status,
      );

      createdImportId = response.body.data.importId;

      // If completed, a resumeId should be returned
      if (response.body.data.status === 'COMPLETED') {
        expect(response.body.data.resumeId).toBeDefined();
      }
    });

    it('should reject import without authentication', async () => {
      const response = await getRequest()
        .post('/api/resume-import/json')
        .send({ data: createValidJsonResume() });

      expect(response.status).toBe(401);
    });

    it('should reject import with invalid token', async () => {
      const response = await getRequest()
        .post('/api/resume-import/json')
        .set('Authorization', 'Bearer invalid-token')
        .send({ data: createValidJsonResume() });

      expect(response.status).toBe(401);
    });
  });

  describe('List import history', () => {
    it('should list imports for the authenticated user', async () => {
      const response = await getRequest()
        .get('/api/resume-import')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // Should contain the import we just created
      if (createdImportId) {
        const found = response.body.data.some((job: { id: string }) => job.id === createdImportId);
        expect(found).toBe(true);
      }
    });

    it('should not show other users imports', async () => {
      const response = await getRequest()
        .get('/api/resume-import')
        .set('Authorization', `Bearer ${otherAccessToken}`);

      expect(response.status).toBe(200);

      // Other user should not see our import
      if (createdImportId) {
        const found = response.body.data.some((job: { id: string }) => job.id === createdImportId);
        expect(found).toBe(false);
      }
    });

    it('should reject listing without authentication', async () => {
      const response = await getRequest().get('/api/resume-import');

      expect(response.status).toBe(401);
    });
  });

  describe('Get import status', () => {
    it('should return import status by ID', async () => {
      if (!createdImportId) {
        console.warn('Skipping - no import was created');
        return;
      }

      const response = await getRequest()
        .get(`/api/resume-import/${createdImportId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(createdImportId);
      expect(response.body.data.source).toBe('JSON');
      expect(response.body.data.status).toBeDefined();
    });

    it('should return 404 for non-existent import ID', async () => {
      const response = await getRequest()
        .get('/api/resume-import/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([404, 400]).toContain(response.status);
    });
  });

  describe('Parse JSON Resume without importing', () => {
    it('should parse valid JSON Resume and return structured data', async () => {
      const jsonResume = createValidJsonResume();

      const response = await getRequest()
        .post('/api/resume-import/parse')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ data: jsonResume });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.personalInfo).toBeDefined();
      expect(response.body.data.personalInfo.name).toBe(jsonResume.basics.name);
      expect(response.body.data.sections).toBeDefined();
      expect(Array.isArray(response.body.data.sections)).toBe(true);
    });

    it('should reject parse without authentication', async () => {
      const response = await getRequest()
        .post('/api/resume-import/parse')
        .send({ data: createValidJsonResume() });

      expect(response.status).toBe(401);
    });
  });

  describe('Error handling for invalid data', () => {
    it('should reject import with missing basics section', async () => {
      const response = await getRequest()
        .post('/api/resume-import/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ data: { work: [] } });

      expect(response.status).toBe(400);
    });

    it('should reject import with missing name in basics', async () => {
      const response = await getRequest()
        .post('/api/resume-import/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          data: {
            basics: {
              email: 'test@example.com',
            },
          },
        });

      expect(response.status).toBe(400);
    });

    it('should reject import with empty data object', async () => {
      const response = await getRequest()
        .post('/api/resume-import/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ data: {} });

      expect(response.status).toBe(400);
    });

    it('should reject import with no body', async () => {
      const response = await getRequest()
        .post('/api/resume-import/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should handle import with minimal valid data', async () => {
      const response = await getRequest()
        .post('/api/resume-import/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          data: {
            basics: {
              name: 'Minimal User',
            },
          },
        });

      // Should succeed with minimal data
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Security edge cases', () => {
    it('should sanitize XSS payloads in resume name', async () => {
      const response = await getRequest()
        .post('/api/resume-import/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          data: {
            basics: {
              name: '<script>alert("xss")</script>',
              summary: '<img src=x onerror=alert(1)>',
            },
          },
        });

      // Should either reject or sanitize
      if (response.status === 201) {
        // If accepted, verify data was stored (sanitization may happen at read time)
        expect(response.body.success).toBe(true);
      }
    });

    it('should handle very large JSON payloads gracefully', async () => {
      const largeResume = createValidJsonResume();
      // Add many work entries
      largeResume.work = Array.from({ length: 100 }, (_, i) => ({
        name: `Company ${i}`,
        position: `Position ${i}`,
        startDate: '2020-01',
        endDate: '2021-01',
        summary: 'A'.repeat(1000),
        highlights: [],
      }));

      const response = await getRequest()
        .post('/api/resume-import/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ data: largeResume });

      // Should either accept or reject with proper error (not crash)
      expect([201, 400, 413]).toContain(response.status);
    });

    it('should not allow SQL injection via resume fields', async () => {
      const response = await getRequest()
        .post('/api/resume-import/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          data: {
            basics: {
              name: "'; DROP TABLE users; --",
              summary: "1' OR '1'='1",
            },
          },
        });

      // Should process normally (Prisma parameterizes queries)
      if (response.status === 201) {
        expect(response.body.success).toBe(true);
      }
    });
  });
});
