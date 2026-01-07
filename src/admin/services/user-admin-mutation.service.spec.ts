/**
 * UserAdminMutationService Tests
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { UserAdminMutationService } from './user-admin-mutation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from '../../auth/services/password.service';
import { UserRole } from '../../common/enums/user-role.enum';

describe('UserAdminMutationService', () => {
  let service: UserAdminMutationService;

  const mockUser = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    username: 'testuser',
    role: 'USER',
  };

  const mockAdmin = {
    id: 'admin-1',
    email: 'admin@example.com',
    name: 'Admin',
    role: 'ADMIN',
  };

  const stubPrisma = {
    user: {
      findUnique: mock(),
      create: mock(),
      update: mock(),
      delete: mock(),
      count: mock(),
    },
  };

  const stubPasswordService = {
    hash: mock().mockResolvedValue('hashed-password'),
  };

  beforeEach(async () => {const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserAdminMutationService,
        { provide: PrismaService, useValue: stubPrisma },
        { provide: PasswordService, useValue: stubPasswordService },
      ],
    }).compile();

    service = module.get<UserAdminMutationService>(UserAdminMutationService);
  });

  describe('create', () => {
    it('should create user successfully', async () => {
      stubPrisma.user.findUnique.mockResolvedValue(null);
      stubPrisma.user.create.mockResolvedValue(mockUser);

      const result = await service.create({
        email: 'new@example.com',
        password: 'Password123!',
        name: 'New User',
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
    });

    it('should hash password before saving', async () => {
      stubPrisma.user.findUnique.mockResolvedValue(null);
      stubPrisma.user.create.mockResolvedValue(mockUser);

      await service.create({
        email: 'new@example.com',
        password: 'Password123!',
        name: 'New User',
      });

      expect(stubPasswordService.hash).toHaveBeenCalledWith('Password123!');
    });

    it('should throw ConflictException when email exists', async () => {
      stubPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.create({
          email: 'user@example.com',
          password: 'Password123!',
          name: 'New User',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should use default role USER if not specified', async () => {
      stubPrisma.user.findUnique.mockResolvedValue(null);
      stubPrisma.user.create.mockResolvedValue(mockUser);

      await service.create({
        email: 'new@example.com',
        password: 'Password123!',
        name: 'New User',
      });

      expect(stubPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: UserRole.USER }),
        }),
      );
    });
  });

  describe('update', () => {
    beforeEach(() => {
      stubPrisma.user.findUnique.mockResolvedValue(mockUser);
    });

    it('should update user successfully', async () => {
      stubPrisma.user.update.mockResolvedValue({
        ...mockUser,
        name: 'Updated',
      });

      const result = await service.update('user-1', { name: 'Updated' });

      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException when user not found', async () => {
      stubPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when email already in use', async () => {
      stubPrisma.user.findUnique
        .mockResolvedValueOnce(mockUser) // findUserOrThrow
        .mockResolvedValueOnce({ id: 'other-user' }); // email check

      await expect(
        service.update('user-1', { email: 'taken@example.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      stubPrisma.user.findUnique.mockResolvedValue(mockUser);
      stubPrisma.user.delete.mockResolvedValue(mockUser);

      const result = await service.delete('user-1');

      expect(result.success).toBe(true);
      expect(result.message).toContain('deleted');
    });

    it('should throw NotFoundException when user not found', async () => {
      stubPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should prevent deleting last admin', async () => {
      stubPrisma.user.findUnique.mockResolvedValue(mockAdmin);
      stubPrisma.user.count.mockResolvedValue(1);

      await expect(service.delete('admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow deleting admin if more than one exists', async () => {
      stubPrisma.user.findUnique.mockResolvedValue(mockAdmin);
      stubPrisma.user.count.mockResolvedValue(2);
      stubPrisma.user.delete.mockResolvedValue(mockAdmin);

      const result = await service.delete('admin-1');

      expect(result.success).toBe(true);
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      stubPrisma.user.findUnique.mockResolvedValue(mockUser);
      stubPrisma.user.update.mockResolvedValue(mockUser);

      const result = await service.resetPassword('user-1', {
        newPassword: 'NewPassword123!',
      });

      expect(result.success).toBe(true);
      expect(stubPasswordService.hash).toHaveBeenCalledWith('NewPassword123!');
    });

    it('should throw NotFoundException when user not found', async () => {
      stubPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.resetPassword('nonexistent', {
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
