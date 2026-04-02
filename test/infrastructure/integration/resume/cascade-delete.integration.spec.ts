/**
 * Resume Delete Cascade & Cache Integration Tests
 *
 * These tests are designed to FIND BUGS, not confirm functionality.
 * Many of these tests are EXPECTED TO FAIL if vulnerabilities exist.
 *
 * BUG DISCOVERY TARGETS:
 * - Cascade delete (sections/items orphaned)
 * - Cache invalidation timing (stale cache)
 * - Event order (event before delete = inconsistency)
 * - Transaction isolation
 * - Race conditions on concurrent operations
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import {
  closeApp,
  createTestUserAndLogin,
  getApp,
  getPrisma,
  getRequest,
  uniqueTestId,
  uniqueTestSlug,
} from '../setup';

describe('Resume Delete Cascade & Cache - Bug Discovery Tests', () => {
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    await getApp();
    const auth = await createTestUserAndLogin({
      email: `cascade-test-${uniqueTestId()}@example.com`,
    });
    accessToken = auth.accessToken;
    userId = auth.userId;
  });

  afterAll(async () => {
    const prisma = getPrisma();
    if (userId) {
      // Clean up any remaining test data
      await prisma.sectionItem.deleteMany({
        where: { resumeSection: { resume: { userId } } },
      });
      await prisma.resumeSection.deleteMany({
        where: { resume: { userId } },
      });
      await prisma.resume.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await closeApp();
  });

  describe('BUG-CASCADE-001: Orphaned Sections After Delete', () => {
    /**
     * EXPECTED BEHAVIOR: Deleting resume should cascade delete all sections
     * ACTUAL BUG: Sections remain orphaned in database
     */
    it('should cascade delete all resume sections - EXPECTED TO FAIL IF ORPHANS EXIST', async () => {
      const prisma = getPrisma();

      // Get or create a resume for this user
      let resume = await prisma.resume.findFirst({ where: { userId } });

      if (!resume) {
        resume = await prisma.resume.create({
          data: {
            userId,
            title: 'Test Resume for Cascade',
            slug: uniqueTestSlug('cascade-test'),
          },
        });
      }

      // Get a section type
      const sectionType = await prisma.sectionType.findFirst();
      if (!sectionType) {
        console.log('No section types found - skipping test');
        return;
      }

      // Create some sections with items
      const section = await prisma.resumeSection.create({
        data: {
          resumeId: resume.id,
          sectionTypeId: sectionType.id,
          order: 99,
        },
      });

      // Create items in the section
      await prisma.sectionItem.createMany({
        data: [
          { resumeSectionId: section.id, order: 0, content: { test: 'item1' } },
          { resumeSectionId: section.id, order: 1, content: { test: 'item2' } },
          { resumeSectionId: section.id, order: 2, content: { test: 'item3' } },
        ],
      });

      // Count items before delete
      const itemsBefore = await prisma.sectionItem.count({
        where: { resumeSectionId: section.id },
      });
      expect(itemsBefore).toBe(3);

      // Delete the resume via API
      const _deleteResponse = await getRequest()
        .delete(`/api/v1/resumes/${resume.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      // Wait for async event handlers to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check for orphaned sections
      const orphanedSections = await prisma.resumeSection.count({
        where: { resumeId: resume.id },
      });

      // Check for orphaned items
      const orphanedItems = await prisma.sectionItem.count({
        where: { resumeSectionId: section.id },
      });

      console.log('Orphaned sections after delete:', orphanedSections);
      console.log('Orphaned items after delete:', orphanedItems);

      // Should be zero orphans
      expect(orphanedSections).toBe(0);
      expect(orphanedItems).toBe(0);
    });
  });

  describe('BUG-CASCADE-002: Stale Cache After Delete', () => {
    /**
     * EXPECTED BEHAVIOR: Cache should be invalidated immediately after delete
     * ACTUAL BUG: Cache returns deleted resume data
     */
    it('should invalidate cache immediately - EXPECTED TO FAIL IF STALE CACHE', async () => {
      const prisma = getPrisma();

      // Create a new resume
      const resume = await prisma.resume.create({
        data: {
          userId,
          title: 'Cache Test Resume',
          slug: uniqueTestSlug('cache-test'),
        },
      });

      // Fetch the resume to populate cache
      const fetchBefore = await getRequest()
        .get(`/api/v1/resumes/${resume.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(fetchBefore.status).toBe(200);

      // Delete the resume
      const deleteResponse = await getRequest()
        .delete(`/api/v1/resumes/${resume.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(deleteResponse.status).toBe(200);

      // IMMEDIATELY try to fetch again (should get 404, not cached 200)
      const fetchAfter = await getRequest()
        .get(`/api/v1/resumes/${resume.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      console.log('Status after delete:', fetchAfter.status);

      // If status is 200, cache wasn't invalidated!
      if (fetchAfter.status === 200) {
        console.warn('CACHE BUG: Stale data returned after delete!');
      }

      expect(fetchAfter.status).toBe(404);
    });
  });

  describe('BUG-CASCADE-003: Concurrent Delete Race Condition', () => {
    /**
     * EXPECTED BEHAVIOR: Double delete should fail gracefully on second attempt
     * ACTUAL BUG: Race condition causes errors or inconsistent state
     */
    it('should handle concurrent deletes gracefully - EXPECTED TO FAIL IF RACE CONDITION', async () => {
      const prisma = getPrisma();

      // Create a resume to delete
      const resume = await prisma.resume.create({
        data: {
          userId,
          title: 'Race Condition Test',
          slug: uniqueTestSlug('race-test'),
        },
      });

      // Send TWO delete requests simultaneously
      const [result1, result2] = await Promise.all([
        getRequest()
          .delete(`/api/v1/resumes/${resume.id}`)
          .set('Authorization', `Bearer ${accessToken}`),
        getRequest()
          .delete(`/api/v1/resumes/${resume.id}`)
          .set('Authorization', `Bearer ${accessToken}`),
      ]);

      console.log('Concurrent delete statuses:', result1.status, result2.status);

      // One should succeed (200), one should fail (404 or similar)
      const _statuses = [result1.status, result2.status].sort();

      // Both returning 200 would indicate no idempotency protection
      const bothSucceeded = result1.status === 200 && result2.status === 200;

      if (bothSucceeded) {
        console.warn('RACE CONDITION: Both deletes returned 200 - no idempotency protection');
      }

      // At least one should be 200 (the successful one)
      expect([200, 404]).toContain(result1.status);
      expect([200, 404]).toContain(result2.status);

      // Resume should definitely not exist anymore
      const resumeExists = await prisma.resume.findUnique({ where: { id: resume.id } });
      expect(resumeExists).toBeNull();
    });
  });

  describe('BUG-CASCADE-004: Delete Non-Existent Resume', () => {
    /**
     * EXPECTED BEHAVIOR: Should return 404 Not Found
     * Test error handling for invalid resume ID
     */
    it('should return 404 for non-existent resume', async () => {
      // Use a valid CUID format that doesn't exist in the database
      const fakeResumeId = 'cmzzzzzzz0000zzzzzzzzzzzz';

      const response = await getRequest()
        .delete(`/api/v1/resumes/${fakeResumeId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('BUG-CASCADE-005: Delete Other User Resume (IDOR)', () => {
    /**
     * EXPECTED BEHAVIOR: Should return 403/404, cannot delete others' resumes
     * ACTUAL BUG: IDOR allows deleting other users' resumes
     */
    it('should not allow deleting other user resume - EXPECTED TO FAIL IF IDOR EXISTS', async () => {
      const prisma = getPrisma();

      // Create another user with a resume
      const otherUser = await createTestUserAndLogin({
        email: `other-user-cascade-${uniqueTestId()}@example.com`,
      });

      // Create resume for other user
      const otherResume = await prisma.resume.create({
        data: {
          userId: otherUser.userId,
          title: 'Other User Resume',
          slug: uniqueTestSlug('other-user'),
        },
      });

      // Try to delete other user's resume with our token
      const response = await getRequest()
        .delete(`/api/v1/resumes/${otherResume.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      console.log('IDOR delete attempt status:', response.status);

      // Should be 403 Forbidden or 404 Not Found
      expect([403, 404]).toContain(response.status);

      // Verify resume still exists
      const resumeStillExists = await prisma.resume.findUnique({
        where: { id: otherResume.id },
      });

      expect(resumeStillExists).not.toBeNull();

      // Cleanup
      await prisma.resume.deleteMany({ where: { userId: otherUser.userId } });
      await prisma.user.deleteMany({ where: { id: otherUser.userId } });
    });
  });

  describe('BUG-CASCADE-006: Cache Consistency on Failed Delete', () => {
    /**
     * EXPECTED BEHAVIOR: If delete fails, cache should remain unchanged
     * ACTUAL BUG: Event published before delete = cache invalidated even on failure
     */
    it('should maintain cache consistency on failed delete - INFORMATIONAL', async () => {
      // This test documents the potential issue where:
      // 1. DeleteResumeUseCase publishes ResumeDeletedEvent
      // 2. InvalidateCacheOnResumeDelete handler invalidates cache
      // 3. Then actual delete happens
      // 4. If delete fails, cache is already invalidated = inconsistent state

      const prisma = getPrisma();

      // Create a resume
      const resume = await prisma.resume.create({
        data: {
          userId,
          title: 'Consistency Test',
          slug: uniqueTestSlug('consistency-test'),
        },
      });

      // Populate cache
      await getRequest()
        .get(`/api/v1/resumes/${resume.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      // Note: In current implementation, event is published BEFORE delete
      // This means if delete fails (e.g., database constraint), cache is already invalidated
      // This is a design flaw but not easily testable without mocking

      console.log('ARCHITECTURE NOTE: Event is published before delete in DeleteResumeUseCase');
      console.log('If delete fails after event is published, cache state is inconsistent');

      // Cleanup
      await prisma.resume.delete({ where: { id: resume.id } });
    });
  });

  describe('BUG-CASCADE-007: User Cache After Resume Delete', () => {
    /**
     * EXPECTED BEHAVIOR: User's resume list cache should be invalidated
     * Test that user:userId:resumes cache key is cleared
     */
    it('should invalidate user resume list cache', async () => {
      // Create a resume through the API to ensure all required data is present
      const createResponse = await getRequest()
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'User Cache Test' });

      expect(createResponse.status).toBe(201);
      const resumeId = createResponse.body.data?.id;
      expect(resumeId).toBeDefined();

      // Fetch user's resumes to populate cache
      const listBefore = await getRequest()
        .get('/api/v1/resumes')
        .set('Authorization', `Bearer ${accessToken}`);

      // Handle paginated response: data.data contains the array
      const resumesBefore = listBefore.body.data?.data || listBefore.body.data || [];
      const countBefore = resumesBefore.length;
      expect(countBefore).toBeGreaterThan(0);

      // Delete the resume
      await getRequest()
        .delete(`/api/v1/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      // Immediately fetch list again
      const listAfter = await getRequest()
        .get('/api/v1/resumes')
        .set('Authorization', `Bearer ${accessToken}`);

      // Handle paginated response
      const resumesAfter = listAfter.body.data?.data || listAfter.body.data || [];
      const countAfter = resumesAfter.length;

      console.log('Resumes before delete:', countBefore);
      console.log('Resumes after delete:', countAfter);

      // Count should be decremented
      expect(countAfter).toBe(countBefore - 1);

      // Deleted resume should NOT appear in list
      const deletedResumeInList = resumesAfter.find((r: { id: string }) => r.id === resumeId);
      expect(deletedResumeInList).toBeUndefined();
    });
  });

  describe('BUG-CASCADE-008: Soft Delete vs Hard Delete', () => {
    /**
     * EXPECTED BEHAVIOR: Document whether delete is soft or hard
     * Check if deleted data can be recovered
     */
    it('should perform hard delete (no recovery) - INFORMATIONAL', async () => {
      const prisma = getPrisma();

      // Create and immediately delete a resume
      const resume = await prisma.resume.create({
        data: {
          userId,
          title: 'Hard Delete Test',
          slug: uniqueTestSlug('hard-delete-test'),
        },
      });

      const resumeId = resume.id;

      await getRequest()
        .delete(`/api/v1/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      // Try to find with raw query (bypass soft delete filters if any)
      const rawResult = await prisma.$queryRaw`
        SELECT * FROM "Resume" WHERE id = ${resumeId}
      `;

      const deletedResume = (rawResult as unknown[]).length > 0;

      console.log('Resume exists in database after delete:', deletedResume);
      console.log('Delete type:', deletedResume ? 'SOFT DELETE' : 'HARD DELETE');

      // If soft delete, document it
      if (deletedResume) {
        console.log('NOTE: Using soft delete - data can be recovered');
      } else {
        console.log('NOTE: Using hard delete - data is permanently removed');
      }
    });
  });

  describe('BUG-CASCADE-009: Delete Without Auth', () => {
    /**
     * EXPECTED BEHAVIOR: Unauthenticated delete should return 401
     */
    it('should reject delete without authentication', async () => {
      const prisma = getPrisma();

      // Create a resume
      const resume = await prisma.resume.create({
        data: {
          userId,
          title: 'No Auth Delete Test',
          slug: uniqueTestSlug('no-auth-test'),
        },
      });

      // Try to delete without auth
      const response = await getRequest().delete(`/api/v1/resumes/${resume.id}`);

      expect(response.status).toBe(401);

      // Resume should still exist
      const resumeExists = await prisma.resume.findUnique({ where: { id: resume.id } });
      expect(resumeExists).not.toBeNull();

      // Cleanup
      await prisma.resume.delete({ where: { id: resume.id } });
    });
  });

  describe('BUG-CASCADE-010: Versions and Analytics Cleanup', () => {
    /**
     * EXPECTED BEHAVIOR: Resume versions and analytics should also be deleted
     * Check for orphaned related data
     */
    it('should cascade delete related data - INFORMATIONAL', async () => {
      const prisma = getPrisma();

      // Create a resume
      const resume = await prisma.resume.create({
        data: {
          userId,
          title: 'Analytics Test',
          slug: uniqueTestSlug('analytics-test'),
        },
      });

      // Check if there are related tables (versions, analytics, etc.)
      // This is informational - document what gets cleaned up

      // Delete the resume
      await getRequest()
        .delete(`/api/v1/resumes/${resume.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      // Check for orphaned resume versions (if table exists)
      try {
        const orphanedVersions = await prisma.$queryRaw`
          SELECT COUNT(*) as count FROM "resume_versions" WHERE "resumeId" = ${resume.id}
        `;
        console.log('Orphaned versions:', orphanedVersions);
      } catch {
        console.log('resume_versions table not found or different schema');
      }

      console.log('NOTE: Verify all related tables cascade delete in Prisma schema');
    });
  });
});
