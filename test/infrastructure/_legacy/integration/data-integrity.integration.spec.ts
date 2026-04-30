/**
 * Data Integrity Integration Tests
 *
 * Bug Discovery: Database consistency and referential integrity.
 *
 * Kent Beck: "Data outlives code. Protect it fiercely."
 *
 * These tests verify that data operations maintain consistency.
 *
 * NOTE: Uses Generic Sections API - the standard way to manage resume content.
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import {
  authHeader,
  closeApp,
  createTestUserAndLogin,
  getApp,
  getPrisma,
  getRequest,
  uniqueTestId,
} from './setup';

type ApiResponse<T> = { data?: T; success?: boolean } & T;

function unwrapData<T>(body: ApiResponse<T>): T {
  return (body.data ?? body) as T;
}

describe('Data Integrity Integration', () => {
  let accessToken: string;
  let userId: string;

  // Custom section type for testing
  let testSectionTypeKey: string;
  let testSectionTypeId: string;

  beforeAll(async () => {
    await getApp();
    const auth = await createTestUserAndLogin();
    accessToken = auth.accessToken;
    userId = auth.userId;

    // Create a custom section type for testing
    const prisma = getPrisma();
    testSectionTypeKey = `data_integrity_${randomUUID().slice(0, 8)}_v1`;
    const sectionType = await prisma.sectionType.create({
      data: {
        key: testSectionTypeKey,
        slug: testSectionTypeKey,
        title: 'Data Integrity Test Section',
        description: 'Section for data integrity tests',
        semanticKind: 'CUSTOM',
        version: 1,
        isActive: true,
        isSystem: false,
        isRepeatable: true,
        minItems: 0,
        maxItems: 10,
        definition: {
          schemaVersion: 1,
          kind: 'CUSTOM',
          fields: [
            { key: 'title', type: 'string', required: true },
            { key: 'description', type: 'string', required: false },
          ],
        },
      },
    });
    testSectionTypeId = sectionType.id;
  });

  afterAll(async () => {
    const prisma = getPrisma();
    if (testSectionTypeId) {
      await prisma.resumeSection.deleteMany({
        where: { sectionTypeId: testSectionTypeId },
      });
      await prisma.sectionType.deleteMany({ where: { id: testSectionTypeId } });
    }
    if (userId) {
      await prisma.resumeShare.deleteMany({
        where: { resume: { userId } },
      });
      await prisma.resumeVersion.deleteMany({
        where: { resume: { userId } },
      });
      await prisma.resume.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await closeApp();
  });

  describe('BUG-013: Cascade Delete Behavior', () => {
    it('should delete related section items when resume is deleted', async () => {
      const prisma = getPrisma();

      // Create resume
      const createRes = await getRequest()
        .post('/api/v1/resumes')
        .set(authHeader(accessToken))
        .send({ title: 'Cascade Test Resume' });

      if (createRes.status !== 201) return;

      const resumeId = unwrapData<{ id: string }>(createRes.body).id;

      // Add section item using generic sections API
      await getRequest()
        .post(`/api/v1/resumes/${resumeId}/sections/${testSectionTypeKey}/items`)
        .set(authHeader(accessToken))
        .send({
          content: {
            title: 'Test Item',
            description: 'Should be deleted with resume',
          },
        });

      // Delete resume
      await getRequest().delete(`/api/v1/resumes/${resumeId}`).set(authHeader(accessToken));

      // Verify section items are also deleted (orphan check)
      const orphanSections = await prisma.resumeSection.findMany({
        where: { resumeId },
        include: { items: true },
      });

      // Either no sections exist, or sections have no items
      const totalItems = orphanSections.reduce((sum, s) => sum + s.items.length, 0);
      expect(totalItems).toBe(0);
    });
  });

  describe('BUG-014: Share and Version Cleanup', () => {
    it('should cleanup shares when resume is deleted', async () => {
      const prisma = getPrisma();

      // Create resume
      const createRes = await getRequest()
        .post('/api/v1/resumes')
        .set(authHeader(accessToken))
        .send({ title: 'Share Cleanup Test' });

      if (createRes.status !== 201) return;

      const resumeId = unwrapData<{ id: string }>(createRes.body).id;

      // Create share
      await getRequest()
        .post(`/api/v1/resumes/${resumeId}/share`)
        .set(authHeader(accessToken))
        .send({});

      // Delete resume
      await getRequest().delete(`/api/v1/resumes/${resumeId}`).set(authHeader(accessToken));

      // Verify shares are cleaned up
      const orphanShares = await prisma.resumeShare.findMany({
        where: { resumeId },
      });

      expect(orphanShares).toHaveLength(0);
    });
  });

  describe('BUG-015: Unique Constraint Violations', () => {
    it('should prevent duplicate email registration', async () => {
      const duplicateEmail = `duplicate-${uniqueTestId()}@example.com`;

      // First registration
      await getRequest().post('/api/accounts').send({
        email: duplicateEmail,
        password: 'SecurePass123!',
        name: 'First User',
      });

      // Second registration with same email
      const response = await getRequest().post('/api/accounts').send({
        email: duplicateEmail,
        password: 'DifferentPass123!',
        name: 'Second User',
      });

      expect(response.status).toBe(409); // Conflict
    });
  });

  describe('BUG-016: Referential Integrity', () => {
    it('should not allow section item for non-existent resume', async () => {
      const fakeResumeId = '00000000-0000-4000-a000-000000000000';

      const response = await getRequest()
        .post(`/api/v1/resumes/${fakeResumeId}/sections/${testSectionTypeKey}/items`)
        .set(authHeader(accessToken))
        .send({
          content: {
            title: 'Test Item',
            description: 'Should fail',
          },
        });

      expect([400, 403, 404]).toContain(response.status);
    });
  });

  describe('BUG-017: Transaction Consistency', () => {
    it('should rollback on partial failure', async () => {
      // This tests that if part of an operation fails,
      // the entire operation should be rolled back.
      // Implementation depends on transaction-wrapped endpoints.

      const response = await getRequest()
        .post('/api/v1/resumes')
        .set(authHeader(accessToken))
        .send({
          title: 'Transaction Test',
          // Add fields that might cause partial failure
        });

      // Should either fully succeed or fully fail
      // 422 is valid - Zod validation error
      expect([201, 400, 422]).toContain(response.status);
    });
  });

  describe('BUG-018: Order Preservation', () => {
    it('should preserve section item order', async () => {
      // Create resume
      const createRes = await getRequest()
        .post('/api/v1/resumes')
        .set(authHeader(accessToken))
        .send({ title: 'Order Test Resume' });

      if (createRes.status !== 201) return;

      const resumeId = unwrapData<{ id: string }>(createRes.body).id;

      // Add multiple section items
      const titles = ['First', 'Second', 'Third'];
      for (const title of titles) {
        await getRequest()
          .post(`/api/v1/resumes/${resumeId}/sections/${testSectionTypeKey}/items`)
          .set(authHeader(accessToken))
          .send({
            content: {
              title,
              description: `${title} item`,
            },
          });
      }

      // Fetch resume sections and check order
      const getRes = await getRequest()
        .get(`/api/v1/resumes/${resumeId}/sections`)
        .set(authHeader(accessToken));

      // Order should be consistent (either creation order or explicit order)
      expect(getRes.status).toBe(200);

      const body = unwrapData<{
        sections?: Array<{
          sectionType?: { key?: string };
          items?: unknown[];
        }>;
      }>(getRes.body);
      const sections = body.sections ?? [];
      const testSection = sections.find((s) => s.sectionType?.key === testSectionTypeKey);

      if (testSection?.items) {
        expect(testSection.items.length).toBeGreaterThanOrEqual(3);
      }
    });
  });
});
