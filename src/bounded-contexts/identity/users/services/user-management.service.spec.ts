/**
 * User Management Service Unit Tests
 *
 * Tests administrative operations on user resources.
 * Focus: CRUD operations, permission checks, safety guards.
 *
 * Kent Beck: "Test the behaviors, not the implementation details"
 * Uncle Bob: "Each test should have a single reason to fail"
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { UserManagementService } from './user-management.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { PasswordService } from '@/bounded-contexts/identity/auth/services/password.service';
import type { AuthorizationService } from '@/bounded-contexts/identity/authorization';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('UserManagementService', () => {
  let service: UserManagementService;
  let mockPrismaService: Partial<PrismaService>;
  let mockPasswordService: Partial<PasswordService>;
  let mockAuthService: Partial<AuthorizationService>;

  const mockUserId = 'user-123';
  const mockRequesterId = 'admin-456';

  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    name: 'Test User',
    username: 'testuser',
    hasCompletedOnboarding: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    image: null,
    emailVerified: true,
    _count: { resumes: 2 },
  };

  beforeEach(() => {
    mockPrismaService = {
      user: {
        findMany: mock(() => Promise.resolve([mockUser])),
        findUnique: mock(() => Promise.resolve(mockUser)),
        count: mock(() => Promise.resolve(1)),
        create: mock(() => Promise.resolve(mockUser)),
        update: mock(() => Promise.resolve(mockUser)),
        delete: mock(() => Promise.resolve(mockUser)),
      } as any,
    };

    mockPasswordService = {
      hash: mock(() => Promise.resolve('hashed-password-123')),
    };

    mockAuthService = {
      hasPermission: mock(() => Promise.resolve(false)),
      countUsersWithRole: mock(() => Promise.resolve(5)),
    };

    service = new UserManagementService(
      mockPrismaService as PrismaService,
      mockPasswordService as PasswordService,
      mockAuthService as AuthorizationService,
    );
  });

  describe('listUsers', () => {
    it('should return paginated users', async () => {
      const result = await service.listUsers({
        page: 1,
        limit: 20,
      });

      expect(result.users).toHaveLength(1);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('should apply search filter', async () => {
      await service.listUsers({
        page: 1,
        limit: 20,
        search: 'john',
      });

      expect(mockPrismaService.user!.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        }),
      );
    });

    it('should calculate correct skip offset', async () => {
      await service.listUsers({
        page: 3,
        limit: 10,
      });

      expect(mockPrismaService.user!.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (3-1) * 10
          take: 10,
        }),
      );
    });

    it('should order by createdAt descending', async () => {
      await service.listUsers({ page: 1, limit: 10 });

      expect(mockPrismaService.user!.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('getUserDetails', () => {
    it('should return user with resumes and preferences', async () => {
      const userWithRelations = {
        ...mockUser,
        resumes: [{ id: 'resume-1', title: 'My Resume' }],
        preferences: { theme: 'dark' },
        password: 'should-be-excluded',
        _count: { accounts: 1, sessions: 2, resumes: 1 },
      };
      (
        mockPrismaService.user!.findUnique as ReturnType<typeof mock>
      ).mockResolvedValue(userWithRelations);

      const result = await service.getUserDetails(mockUserId);

      expect(result.email).toBe('test@example.com');
      expect(result.resumes).toBeDefined();
      expect((result as any).password).toBeUndefined();
    });

    it('should throw NotFoundException when user not found', async () => {
      (
        mockPrismaService.user!.findUnique as ReturnType<typeof mock>
      ).mockResolvedValue(null);

      await expect(service.getUserDetails('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createUser', () => {
    it('should create user with hashed password', async () => {
      const createData = {
        email: 'new@example.com',
        password: 'SecurePass123!',
        name: 'New User',
      };

      await service.createUser(createData);

      expect(mockPasswordService.hash).toHaveBeenCalledWith('SecurePass123!');
      expect(mockPrismaService.user!.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@example.com',
            password: 'hashed-password-123',
            name: 'New User',
          }),
        }),
      );
    });

    it('should return success response with created user', async () => {
      const result = await service.createUser({
        email: 'new@example.com',
        password: 'SecurePass123!',
        name: 'New User',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('User created successfully');
    });

    it('should throw ConflictException on duplicate email', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.0.0' },
      );
      (
        mockPrismaService.user!.create as ReturnType<typeof mock>
      ).mockRejectedValue(prismaError);

      await expect(
        service.createUser({
          email: 'existing@example.com',
          password: 'SecurePass123!',
          name: 'Dup User',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateUser', () => {
    it('should update user fields', async () => {
      const updateData = { name: 'Updated Name' };

      const result = await service.updateUser(mockUserId, updateData);

      expect(result.success).toBe(true);
      expect(mockPrismaService.user!.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUserId },
          data: updateData,
        }),
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      (
        mockPrismaService.user!.findUnique as ReturnType<typeof mock>
      ).mockResolvedValue(null);

      await expect(
        service.updateUser('non-existent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException on duplicate email', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: ['email'] },
        } as any,
      );
      (
        mockPrismaService.user!.update as ReturnType<typeof mock>
      ).mockRejectedValue(prismaError);

      await expect(
        service.updateUser(mockUserId, { email: 'taken@example.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException on duplicate username', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: ['username'] },
        } as any,
      );
      (
        mockPrismaService.user!.update as ReturnType<typeof mock>
      ).mockRejectedValue(prismaError);

      await expect(
        service.updateUser(mockUserId, { username: 'taken' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const result = await service.deleteUser(mockUserId, mockRequesterId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('User deleted successfully');
      expect(mockPrismaService.user!.delete).toHaveBeenCalledWith({
        where: { id: mockUserId },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      (
        mockPrismaService.user!.findUnique as ReturnType<typeof mock>
      ).mockResolvedValue(null);

      await expect(
        service.deleteUser('non-existent', mockRequesterId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should prevent self-deletion', async () => {
      await expect(service.deleteUser(mockUserId, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should prevent deleting last privileged user', async () => {
      (
        mockAuthService.hasPermission as ReturnType<typeof mock>
      ).mockResolvedValue(true);
      (
        mockAuthService.countUsersWithRole as ReturnType<typeof mock>
      ).mockResolvedValue(1);

      await expect(
        service.deleteUser(mockUserId, mockRequesterId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow deleting non-privileged user', async () => {
      (
        mockAuthService.hasPermission as ReturnType<typeof mock>
      ).mockResolvedValue(false);

      const result = await service.deleteUser(mockUserId, mockRequesterId);

      expect(result.success).toBe(true);
    });

    it('should allow deleting privileged user if others exist', async () => {
      (
        mockAuthService.hasPermission as ReturnType<typeof mock>
      ).mockResolvedValue(true);
      (
        mockAuthService.countUsersWithRole as ReturnType<typeof mock>
      ).mockResolvedValue(3);

      const result = await service.deleteUser(mockUserId, mockRequesterId);

      expect(result.success).toBe(true);
    });
  });

  describe('resetPassword', () => {
    it('should reset password with new hashed value', async () => {
      const result = await service.resetPassword(mockUserId, {
        newPassword: 'NewSecurePass456!',
      });

      expect(result.success).toBe(true);
      expect(mockPasswordService.hash).toHaveBeenCalledWith(
        'NewSecurePass456!',
      );
      expect(mockPrismaService.user!.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { password: 'hashed-password-123' },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      (
        mockPrismaService.user!.findUnique as ReturnType<typeof mock>
      ).mockResolvedValue(null);

      await expect(
        service.resetPassword('non-existent', { newPassword: 'Test123!' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
