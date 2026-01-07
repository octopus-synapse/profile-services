/**
 * UserAdminQueryService Tests
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UserAdminQueryService } from './user-admin-query.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '../../common/enums/user-role.enum';

describe('UserAdminQueryService', () => {
  let service: UserAdminQueryService;

  const mockUsers = [
    {
      id: 'user-1',
      email: 'admin@example.com',
      name: 'Admin User',
      username: 'admin',
      role: 'ADMIN',
      hasCompletedOnboarding: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      image: null,
      emailVerified: new Date(),
      _count: { resumes: 2 },
    },
    {
      id: 'user-2',
      email: 'user@example.com',
      name: 'Regular User',
      username: 'regular',
      role: 'USER',
      hasCompletedOnboarding: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      image: null,
      emailVerified: null,
      _count: { resumes: 1 },
    },
  ];

  const mockUserDetail = {
    ...mockUsers[0],
    password: 'hashed-password',
    resumes: [{ id: 'r1', title: 'Resume 1' }],
    preferences: { theme: 'dark' },
    _count: { accounts: 1, sessions: 2, resumes: 2 },
  };

  const stubPrisma = {
    user: {
      findMany: mock().mockResolvedValue(mockUsers),
      count: mock().mockResolvedValue(2),
      findUnique: mock().mockResolvedValue(mockUserDetail),
    },
  };

  beforeEach(async () => {const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserAdminQueryService,
        { provide: PrismaService, useValue: stubPrisma },
      ],
    }).compile();

    service = module.get<UserAdminQueryService>(UserAdminQueryService);
  });

  describe('getAll', () => {
    it('should return paginated users list', async () => {
      const result = await service.getAll({ page: 1, limit: 10 });

      expect(result.users).toHaveLength(2);
      expect(result.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
    });

    it('should filter by search term', async () => {
      await service.getAll({ page: 1, limit: 10, search: 'admin' });

      expect(stubPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ email: expect.any(Object) }),
            ]),
          }),
        }),
      );
    });

    it('should filter by role', async () => {
      await service.getAll({ page: 1, limit: 10, role: UserRole.ADMIN });

      expect(stubPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: UserRole.ADMIN,
          }),
        }),
      );
    });

    it('should calculate correct pagination', async () => {
      stubPrisma.user.count.mockResolvedValueOnce(25);

      const result = await service.getAll({ page: 2, limit: 10 });

      expect(result.pagination.totalPages).toBe(3);
    });
  });

  describe('getById', () => {
    it('should return user without password', async () => {
      const result = await service.getById('user-1');

      expect(result).toMatchObject({
        id: 'user-1',
        email: 'admin@example.com',
      });
      expect(result).not.toHaveProperty('password');
    });

    it('should include resumes and preferences', async () => {
      const result = await service.getById('user-1');

      expect(result.resumes).toBeDefined();
      expect(result.preferences).toBeDefined();
    });

    it('should throw NotFoundException when user not found', async () => {
      stubPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(service.getById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
