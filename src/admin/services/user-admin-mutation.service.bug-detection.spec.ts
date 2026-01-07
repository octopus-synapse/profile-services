/**
 * User Admin Mutation Service Bug Detection Tests
 *
 * These tests are written from SPECIFICATIONS, not from implementation.
 * Uncle Bob: "First make it work. Then make it right. Then make it fast."
 * But FIRST, make sure you can DETECT when it's NOT working.
 *
 * EXPECTED: Some tests will FAIL - that's the point. They expose bugs.
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UserAdminMutationService } from './user-admin-mutation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from '../../auth/services/password.service';
import { UserRole } from '../../common/enums/user-role.enum';

describe('UserAdminMutationService - Bug Detection', () => {
  let service: UserAdminMutationService;
  let mockPrisma: any;

  const adminUser = {
    id: 'admin-123',
    email: 'admin@example.com',
    username: 'admin',
    role: UserRole.ADMIN,
  };

  const regularUser = {
    id: 'user-456',
    email: 'user@example.com',
    username: 'regularuser',
    role: UserRole.USER,
  };

  beforeEach(async () => {
    mockPrisma = {
      user: {
        findUnique: mock().mockResolvedValue(adminUser),
        create: mock(),
        update: mock().mockResolvedValue(adminUser),
        delete: mock(),
        count: mock().mockResolvedValue(1),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserAdminMutationService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: PasswordService,
          useValue: { hash: mock().mockResolvedValue('hashed') },
        },
      ],
    }).compile();

    service = module.get<UserAdminMutationService>(UserAdminMutationService);
  });

  /**
   * BUG: Last admin cannot REMOVE their own admin role via UPDATE
   *
   * Business Rule: "If there's only one admin:
   *                 - They cannot remove their own role
   *                 - They cannot delete their account"
   *
   * Current behavior: Only checks on DELETE, not on UPDATE (role change)
   * Expected behavior: Should also prevent role change from ADMIN to USER/other
   */
  describe('BUG: Last admin role removal via UPDATE', () => {
    it('should REJECT updating last admin role to USER', async () => {
      // Only 1 admin exists
      mockPrisma.user.count.mockResolvedValue(1);
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);

      await expect(
        service.update('admin-123', { role: UserRole.USER }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should REJECT updating last admin role to APPROVER', async () => {
      mockPrisma.user.count.mockResolvedValue(1);
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);

      await expect(
        service.update('admin-123', { role: 'APPROVER' as UserRole }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should ALLOW updating admin role if there are multiple admins', async () => {
      // 2 admins exist
      mockPrisma.user.count.mockResolvedValue(2);
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);

      const result = await service.update('admin-123', { role: UserRole.USER });
      expect(result.success).toBe(true);
    });

    it('should include "last admin" in error message', async () => {
      mockPrisma.user.count.mockResolvedValue(1);
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);

      try {
        await service.update('admin-123', { role: UserRole.USER });
        fail('Should have thrown');
      } catch (error) {
        const msg = (error as Error).message.toLowerCase();
        expect(msg).toMatch(/last|only|admin/);
      }
    });
  });

  /**
   * BUG: Self-demotion as last admin
   *
   * Business Rule: Admin cannot demote themselves if they're the last one
   */
  describe('Self-demotion protection', () => {
    it('should REJECT last admin demoting themselves', async () => {
      mockPrisma.user.count.mockResolvedValue(1);
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);

      // Admin trying to demote themselves
      await expect(
        service.update('admin-123', { role: UserRole.USER }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should REJECT last admin setting their role to null', async () => {
      mockPrisma.user.count.mockResolvedValue(1);
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);

      await expect(
        service.update('admin-123', { role: null as any }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  /**
   * Audit trail for admin operations
   *
   * Business Rule: "All promotions must be audited."
   */
  describe('Audit trail', () => {
    it('should create audit log when promoting user to admin', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(regularUser);
      mockPrisma.user.update.mockResolvedValue({
        ...regularUser,
        role: UserRole.ADMIN,
      });
      mockPrisma.auditLog = { create: mock() };

      await service.update('user-456', { role: UserRole.ADMIN });

      // Check that audit log was created
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: expect.stringMatching(
              /ROLE_CHANGE|PROMOTION|ADMIN_GRANTED/i,
            ),
          }),
        }),
      );
    });

    it('should create audit log when demoting admin to user', async () => {
      mockPrisma.user.count.mockResolvedValue(2); // Multiple admins
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);
      mockPrisma.user.update.mockResolvedValue({
        ...adminUser,
        role: UserRole.USER,
      });
      mockPrisma.auditLog = { create: mock() };

      await service.update('admin-123', { role: UserRole.USER });

      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });
  });

  /**
   * Password reset validation
   */
  describe('Password reset', () => {
    it('should REJECT weak passwords', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(regularUser);

      await expect(
        service.resetPassword('user-456', { newPassword: '123' }), // Too weak
      ).rejects.toThrow(BadRequestException);
    });

    it('should create audit log for password reset', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(regularUser);
      mockPrisma.auditLog = { create: mock() };

      await service.resetPassword('user-456', { newPassword: 'StrongP@ss1!' });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: expect.stringMatching(/PASSWORD_RESET|ADMIN_RESET/i),
          }),
        }),
      );
    });
  });
});
