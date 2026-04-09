/**
 * E2E Journey: Admin User Management
 *
 * Tests the complete admin management flow:
 * 1. Create admin user and assign admin role
 * 2. Admin lists all users
 * 3. Admin creates a new user
 * 4. Admin updates user profile
 * 5. Admin resets user password
 * 6. Admin deactivates user
 * 7. Verify deactivated user cannot login
 * 8. Non-admin cannot access any admin endpoints
 *
 * Target Time: < 30 seconds
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { AuthHelper } from '../helpers/auth.helper';
import type { CleanupHelper } from '../helpers/cleanup.helper';
import { createE2ETestApp } from '../setup';

describe('E2E Journey: Admin User Management', () => {
  let app: INestApplication;
  let authHelper: AuthHelper;
  let cleanupHelper: CleanupHelper;
  let prisma: PrismaService;

  // Admin user
  let adminUser: { email: string; password: string; name: string; token?: string; userId?: string };

  // Regular user (created via signup)
  let regularUser: {
    email: string;
    password: string;
    name: string;
    token?: string;
    userId?: string;
  };

  // User created by admin
  let adminCreatedUserId: string;
  let adminCreatedEmail: string;
  const adminCreatedPassword = 'AdminCreated123!';

  // Track all user emails for cleanup
  const cleanupEmails: string[] = [];

  beforeAll(async () => {
    const testApp = await createE2ETestApp();
    app = testApp.app;
    authHelper = testApp.authHelper;
    cleanupHelper = testApp.cleanupHelper;
    prisma = testApp.prisma;
  });

  afterAll(async () => {
    for (const email of cleanupEmails) {
      try {
        await cleanupHelper.deleteUserByEmail(email);
      } catch {
        // Ignore cleanup errors
      }
    }
    await app.close();
  });

  // =========================================================================
  // Step 1: Create admin user and assign admin role
  // =========================================================================

  describe('Step 1: Admin user setup', () => {
    it('should create an admin user and assign admin role', async () => {
      adminUser = authHelper.createTestUser('admin-mgmt');
      const result = await authHelper.registerAndLogin(adminUser);
      adminUser.token = result.token;
      adminUser.userId = result.userId;
      cleanupEmails.push(adminUser.email);

      expect(adminUser.token).toBeDefined();
      expect(adminUser.userId).toBeDefined();

      // Assign admin role via UserRoleAssignment (for authorization module PermissionGuard)
      const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
      if (adminRole) {
        await prisma.userRoleAssignment.upsert({
          where: { userId_roleId: { userId: adminUser.userId!, roleId: adminRole.id } },
          create: { userId: adminUser.userId!, roleId: adminRole.id },
          update: {},
        });
      }

      // Update roles array on User model (for shared-kernel PermissionGuard)
      await prisma.user.update({
        where: { id: adminUser.userId },
        data: { roles: ['role_user', 'role_admin'] },
      });
    });

    it('should create a regular user for comparison', async () => {
      regularUser = authHelper.createTestUser('regular-mgmt');
      const result = await authHelper.registerAndLogin(regularUser);
      regularUser.token = result.token;
      regularUser.userId = result.userId;
      cleanupEmails.push(regularUser.email);

      expect(regularUser.token).toBeDefined();
    });
  });

  // =========================================================================
  // Step 2: Admin lists all users
  // =========================================================================

  describe('Step 2: Admin lists users', () => {
    it('should list all users with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/manage')
        .set('Authorization', `Bearer ${adminUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeArray();
      expect(response.body.data.users.length).toBeGreaterThanOrEqual(2);
      expect(response.body.data.pagination).toBeDefined();

      // Verify users have expected shape
      const firstUser = response.body.data.users[0];
      expect(firstUser).toHaveProperty('id');
      expect(firstUser).toHaveProperty('email');
      expect(firstUser).toHaveProperty('createdAt');
    });

    it('should filter users by search term', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/manage?search=${encodeURIComponent('admin-mgmt')}`)
        .set('Authorization', `Bearer ${adminUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.users).toBeArray();
    });
  });

  // =========================================================================
  // Step 3: Admin creates a new user
  // =========================================================================

  describe('Step 3: Admin creates a user', () => {
    it('should create a new user via admin endpoint', async () => {
      adminCreatedEmail = `e2e-admin-created-${Date.now()}@example.com`;
      cleanupEmails.push(adminCreatedEmail);

      const response = await request(app.getHttpServer())
        .post('/api/v1/users/manage')
        .set('Authorization', `Bearer ${adminUser.token}`)
        .send({
          email: adminCreatedEmail,
          password: adminCreatedPassword,
          name: 'Admin Created User',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.message).toContain('created');

      adminCreatedUserId = response.body.data.user.id;
      expect(adminCreatedUserId).toBeDefined();
    });

    it('should find the created user in user list', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/manage/${adminCreatedUserId}`)
        .set('Authorization', `Bearer ${adminUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.user.id).toBe(adminCreatedUserId);
    });
  });

  // =========================================================================
  // Step 4: Admin updates user profile
  // =========================================================================

  describe('Step 4: Admin updates user', () => {
    it('should update user name', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/users/manage/${adminCreatedUserId}`)
        .set('Authorization', `Bearer ${adminUser.token}`)
        .send({ name: 'Updated by Admin' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should verify the update persisted', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/manage/${adminCreatedUserId}`)
        .set('Authorization', `Bearer ${adminUser.token}`);

      expect(response.status).toBe(200);
      // Verify name was updated
      const user = response.body.data.user;
      expect(user.name).toBe('Updated by Admin');
    });
  });

  // =========================================================================
  // Step 5: Admin resets user password
  // =========================================================================

  describe('Step 5: Admin resets user password', () => {
    it('should reset password for the created user', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/users/manage/${adminCreatedUserId}/reset-password`)
        .set('Authorization', `Bearer ${adminUser.token}`)
        .send({ newPassword: 'ResetByAdmin123!' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('reset');
    });
  });

  // =========================================================================
  // Step 6: Admin deactivates user
  // =========================================================================

  describe('Step 6: Admin deactivates user', () => {
    it('should deactivate the created user', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/users/manage/${adminCreatedUserId}`)
        .set('Authorization', `Bearer ${adminUser.token}`)
        .send({ isActive: false });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should show user as inactive in details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/manage/${adminCreatedUserId}`)
        .set('Authorization', `Bearer ${adminUser.token}`);

      expect(response.status).toBe(200);
      // Depending on response shape, isActive might be in user object
      const user = response.body.data.user;
      expect(user.isActive).toBe(false);
    });
  });

  // =========================================================================
  // Step 7: Deactivated user cannot login
  // =========================================================================

  describe('Step 7: Deactivated user login attempt', () => {
    it('should prevent deactivated user from logging in', async () => {
      // First verify email for the admin-created user so login would work if active
      await prisma.user.update({
        where: { id: adminCreatedUserId },
        data: { emailVerified: new Date() },
      });

      const response = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: adminCreatedEmail,
        password: 'ResetByAdmin123!',
      });

      // Deactivated user should get 401 or 403
      expect([401, 403]).toContain(response.status);
    });
  });

  // =========================================================================
  // Step 8: Non-admin cannot access admin endpoints
  // =========================================================================

  describe('Step 8: Non-admin access denied', () => {
    it('should deny listing users', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/manage')
        .set('Authorization', `Bearer ${regularUser.token}`);

      expect(response.status).toBe(403);
    });

    it('should deny creating users', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users/manage')
        .set('Authorization', `Bearer ${regularUser.token}`)
        .send({
          email: 'should-not-exist@example.com',
          password: 'SecurePass123!',
        });

      expect(response.status).toBe(403);
    });

    it('should deny updating users', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/users/manage/${adminCreatedUserId}`)
        .set('Authorization', `Bearer ${regularUser.token}`)
        .send({ name: 'Hacked' });

      expect(response.status).toBe(403);
    });

    it('should deny deleting users', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/users/manage/${adminCreatedUserId}`)
        .set('Authorization', `Bearer ${regularUser.token}`);

      expect(response.status).toBe(403);
    });

    it('should deny resetting passwords', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/users/manage/${adminCreatedUserId}/reset-password`)
        .set('Authorization', `Bearer ${regularUser.token}`)
        .send({ newPassword: 'HackedPass123!' });

      expect(response.status).toBe(403);
    });

    it('should deny unauthenticated access', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/users/manage');

      expect(response.status).toBe(401);
    });
  });

  // =========================================================================
  // Cleanup: Admin reactivates and deletes test user
  // =========================================================================

  describe('Step 9: Admin cleanup', () => {
    it('should reactivate and then delete the test user', async () => {
      // Reactivate first (in case delete checks active status)
      await request(app.getHttpServer())
        .patch(`/api/v1/users/manage/${adminCreatedUserId}`)
        .set('Authorization', `Bearer ${adminUser.token}`)
        .send({ isActive: true });

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/users/manage/${adminCreatedUserId}`)
        .set('Authorization', `Bearer ${adminUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Remove from cleanup list since it's already deleted
      const idx = cleanupEmails.indexOf(adminCreatedEmail);
      if (idx >= 0) cleanupEmails.splice(idx, 1);
    });

    it('should no longer find the deleted user', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/manage/${adminCreatedUserId}`)
        .set('Authorization', `Bearer ${adminUser.token}`);

      expect([404, 400]).toContain(response.status);
    });
  });
});
