/**
 * Admin RBAC Integration Tests
 *
 * Tests the admin user management endpoints and permission system.
 * Verifies that the RBAC system correctly enforces access control:
 * - Regular users cannot access admin endpoints
 * - Admin users can perform CRUD on users
 * - Edge cases around self-deletion and role assignment
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import {
  authHeader,
  closeApp,
  createTestUserAndLogin,
  getApp,
  getPrisma,
  getRequest,
  uniqueTestEmail,
} from './setup';

const describeIntegration =
  process.env.DATABASE_URL && !process.env.SKIP_INTEGRATION ? describe : describe.skip;

describeIntegration('Admin RBAC Integration', () => {
  // Regular user credentials
  let regularToken: string;
  let regularUserId: string;

  // Admin user credentials
  let adminToken: string;
  let adminUserId: string;

  // Track users for cleanup
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    await getApp();
    const prisma = getPrisma();

    // Create regular user
    const regularAuth = await createTestUserAndLogin();
    regularToken = regularAuth.accessToken;
    regularUserId = regularAuth.userId;
    createdUserIds.push(regularUserId);

    // Create admin user
    const adminAuth = await createTestUserAndLogin({
      email: uniqueTestEmail('admin-rbac'),
    });
    adminToken = adminAuth.accessToken;
    adminUserId = adminAuth.userId;
    createdUserIds.push(adminUserId);

    // Assign admin role via UserRoleAssignment table (used by authorization module's PermissionGuard)
    const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
    if (adminRole) {
      await prisma.userRoleAssignment.upsert({
        where: { userId_roleId: { userId: adminUserId, roleId: adminRole.id } },
        create: { userId: adminUserId, roleId: adminRole.id },
        update: {},
      });
    }

    // Also update the roles array on User model (used by shared-kernel PermissionGuard)
    await prisma.user.update({
      where: { id: adminUserId },
      data: { roles: ['role_user', 'role_admin'] },
    });
  });

  afterAll(async () => {
    const prisma = getPrisma();
    for (const id of createdUserIds) {
      try {
        await prisma.userRoleAssignment.deleteMany({ where: { userId: id } });
        await prisma.userConsent.deleteMany({ where: { userId: id } });
        await prisma.resume.deleteMany({ where: { userId: id } });
        await prisma.user.deleteMany({ where: { id } });
      } catch {
        // Ignore cleanup errors
      }
    }
    await closeApp();
  });

  // =========================================================================
  // Authorization Enforcement
  // =========================================================================

  describe('Regular user cannot access admin endpoints', () => {
    it('should return 403 when listing users as regular user', async () => {
      const response = await getRequest().get('/api/v1/users/manage').set(authHeader(regularToken));

      expect(response.status).toBe(403);
    });

    it('should return 403 when getting user details as regular user', async () => {
      const response = await getRequest()
        .get(`/api/v1/users/manage/${adminUserId}`)
        .set(authHeader(regularToken));

      expect(response.status).toBe(403);
    });

    it('should return 403 when creating a user as regular user', async () => {
      const response = await getRequest()
        .post('/api/v1/users/manage')
        .set(authHeader(regularToken))
        .send({
          email: uniqueTestEmail('should-not-create'),
          password: 'SecurePass123!',
          name: 'Should Not Exist',
        });

      expect(response.status).toBe(403);
    });

    it('should return 403 when updating a user as regular user', async () => {
      const response = await getRequest()
        .patch(`/api/v1/users/manage/${adminUserId}`)
        .set(authHeader(regularToken))
        .send({ name: 'Hacked Name' });

      expect(response.status).toBe(403);
    });

    it('should return 403 when deleting a user as regular user', async () => {
      const response = await getRequest()
        .delete(`/api/v1/users/manage/${adminUserId}`)
        .set(authHeader(regularToken));

      expect(response.status).toBe(403);
    });

    it('should return 403 when resetting password as regular user', async () => {
      const response = await getRequest()
        .post(`/api/v1/users/manage/${adminUserId}/reset-password`)
        .set(authHeader(regularToken))
        .send({ newPassword: 'HackedPass123!' });

      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated access is rejected', () => {
    it('should return 401 when accessing admin endpoints without token', async () => {
      const response = await getRequest().get('/api/v1/users/manage');

      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await getRequest()
        .get('/api/v1/users/manage')
        .set('Authorization', 'Bearer invalid-token-here');

      expect(response.status).toBe(401);
    });

    it('should return 401 with malformed Authorization header', async () => {
      const response = await getRequest()
        .get('/api/v1/users/manage')
        .set('Authorization', 'NotBearer sometoken');

      expect(response.status).toBe(401);
    });
  });

  // =========================================================================
  // Admin CRUD Operations
  // =========================================================================

  describe('Admin can list users', () => {
    it('should list users with default pagination', async () => {
      const response = await getRequest().get('/api/v1/users/manage').set(authHeader(adminToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeArray();
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should support pagination parameters', async () => {
      const response = await getRequest()
        .get('/api/v1/users/manage?page=1&limit=5')
        .set(authHeader(adminToken));

      expect(response.status).toBe(200);
      expect(response.body.data.users.length).toBeLessThanOrEqual(5);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should support search parameter', async () => {
      const response = await getRequest()
        .get('/api/v1/users/manage?search=integration')
        .set(authHeader(adminToken));

      expect(response.status).toBe(200);
      expect(response.body.data.users).toBeArray();
    });
  });

  describe('Admin can get user details', () => {
    it('should return user details by ID', async () => {
      const response = await getRequest()
        .get(`/api/v1/users/manage/${regularUserId}`)
        .set(authHeader(adminToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.id).toBe(regularUserId);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await getRequest()
        .get('/api/v1/users/manage/nonexistent-user-id-12345')
        .set(authHeader(adminToken));

      expect([404, 400]).toContain(response.status);
    });
  });

  describe('Admin can create users', () => {
    it('should create a new user', async () => {
      const newUserEmail = uniqueTestEmail('admin-created');
      const response = await getRequest()
        .post('/api/v1/users/manage')
        .set(authHeader(adminToken))
        .send({
          email: newUserEmail,
          password: 'NewUserPass123!',
          name: 'Admin Created User',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.message).toContain('created');

      // Track for cleanup
      if (response.body.data.user?.id) {
        createdUserIds.push(response.body.data.user.id);
      }
    });

    it('should reject creation with invalid email', async () => {
      const response = await getRequest()
        .post('/api/v1/users/manage')
        .set(authHeader(adminToken))
        .send({
          email: 'not-an-email',
          password: 'SecurePass123!',
          name: 'Invalid Email User',
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should reject creation with short password', async () => {
      const response = await getRequest()
        .post('/api/v1/users/manage')
        .set(authHeader(adminToken))
        .send({
          email: uniqueTestEmail('short-pass'),
          password: '123',
          name: 'Short Password User',
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should reject creation without required fields', async () => {
      const response = await getRequest()
        .post('/api/v1/users/manage')
        .set(authHeader(adminToken))
        .send({});

      expect([400, 422]).toContain(response.status);
    });

    it('should reject duplicate email creation', async () => {
      const duplicateEmail = uniqueTestEmail('duplicate-admin');

      // Create first user
      const first = await getRequest()
        .post('/api/v1/users/manage')
        .set(authHeader(adminToken))
        .send({
          email: duplicateEmail,
          password: 'SecurePass123!',
          name: 'First User',
        });

      if (first.body.data?.user?.id) {
        createdUserIds.push(first.body.data.user.id);
      }

      // Try to create second user with same email
      const second = await getRequest()
        .post('/api/v1/users/manage')
        .set(authHeader(adminToken))
        .send({
          email: duplicateEmail,
          password: 'SecurePass123!',
          name: 'Second User',
        });

      expect([400, 409]).toContain(second.status);
    });
  });

  describe('Admin can update users', () => {
    it('should update user name', async () => {
      const response = await getRequest()
        .patch(`/api/v1/users/manage/${regularUserId}`)
        .set(authHeader(adminToken))
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
    });

    it('should update user active status', async () => {
      // Create a user to deactivate (don't deactivate our test user)
      const targetEmail = uniqueTestEmail('deactivate-target');
      const createResp = await getRequest()
        .post('/api/v1/users/manage')
        .set(authHeader(adminToken))
        .send({
          email: targetEmail,
          password: 'SecurePass123!',
          name: 'Deactivation Target',
        });

      if (createResp.body.data?.user?.id) {
        const targetId = createResp.body.data.user.id;
        createdUserIds.push(targetId);

        const response = await getRequest()
          .patch(`/api/v1/users/manage/${targetId}`)
          .set(authHeader(adminToken))
          .send({ isActive: false });

        expect(response.status).toBe(200);
      }
    });

    it('should return 404 when updating non-existent user', async () => {
      const response = await getRequest()
        .patch('/api/v1/users/manage/nonexistent-id-xyz')
        .set(authHeader(adminToken))
        .send({ name: 'Ghost User' });

      expect([404, 400]).toContain(response.status);
    });
  });

  describe('Admin can reset user password', () => {
    it('should reset password for a user', async () => {
      const response = await getRequest()
        .post(`/api/v1/users/manage/${regularUserId}/reset-password`)
        .set(authHeader(adminToken))
        .send({ newPassword: 'ResetPass123!' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('reset');
    });

    it('should reject password reset with short password', async () => {
      const response = await getRequest()
        .post(`/api/v1/users/manage/${regularUserId}/reset-password`)
        .set(authHeader(adminToken))
        .send({ newPassword: '123' });

      expect([400, 422]).toContain(response.status);
    });

    it('should return error for non-existent user password reset', async () => {
      const response = await getRequest()
        .post('/api/v1/users/manage/nonexistent-id-abc/reset-password')
        .set(authHeader(adminToken))
        .send({ newPassword: 'NewPass123!' });

      expect([404, 400]).toContain(response.status);
    });
  });

  describe('Admin can delete users', () => {
    it('should delete a user', async () => {
      // Create a user specifically to delete
      const deleteEmail = uniqueTestEmail('delete-target');
      const createResp = await getRequest()
        .post('/api/v1/users/manage')
        .set(authHeader(adminToken))
        .send({
          email: deleteEmail,
          password: 'SecurePass123!',
          name: 'Delete Target',
        });

      expect(createResp.status).toBe(201);
      const deleteTargetId = createResp.body.data.user.id;

      const response = await getRequest()
        .delete(`/api/v1/users/manage/${deleteTargetId}`)
        .set(authHeader(adminToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return error when deleting non-existent user', async () => {
      const response = await getRequest()
        .delete('/api/v1/users/manage/nonexistent-id-xyz')
        .set(authHeader(adminToken));

      expect([404, 400]).toContain(response.status);
    });
  });

  // =========================================================================
  // Edge Cases
  // =========================================================================

  describe('Edge cases', () => {
    it('should handle admin trying to delete themselves', async () => {
      const response = await getRequest()
        .delete(`/api/v1/users/manage/${adminUserId}`)
        .set(authHeader(adminToken));

      // Should either reject self-deletion or succeed (depending on business rule)
      // Either way, it should not cause a 500
      expect(response.status).not.toBe(500);
    });

    it('should handle empty body on update', async () => {
      const response = await getRequest()
        .patch(`/api/v1/users/manage/${regularUserId}`)
        .set(authHeader(adminToken))
        .send({});

      // Should either succeed (no-op) or reject with validation error
      expect([200, 400, 422]).toContain(response.status);
    });

    it('should handle SQL injection in search parameter', async () => {
      const response = await getRequest()
        .get("/api/v1/users/manage?search='; DROP TABLE users; --")
        .set(authHeader(adminToken));

      expect(response.status).not.toBe(500);
      expect(response.body.message || '').not.toMatch(/syntax error|SQL/i);
    });

    it('should handle very large page number', async () => {
      const response = await getRequest()
        .get('/api/v1/users/manage?page=999999&limit=10')
        .set(authHeader(adminToken));

      expect(response.status).toBe(200);
      expect(response.body.data.users).toBeArray();
      // Should return empty array for out-of-range page
      expect(response.body.data.users.length).toBe(0);
    });

    it('should handle negative pagination values', async () => {
      const response = await getRequest()
        .get('/api/v1/users/manage?page=-1&limit=-5')
        .set(authHeader(adminToken));

      // Should either normalize to valid values or reject
      expect(response.status).not.toBe(500);
    });
  });
});
