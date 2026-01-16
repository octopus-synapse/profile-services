/**
 * Admin Stats Service Tests
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminStatsService } from './admin-stats.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AdminStatsService', () => {
  let service: AdminStatsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        count: mock(),
      },
      resume: {
        count: mock(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminStatsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AdminStatsService>(AdminStatsService);
    prisma = module.get(PrismaService);
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      (prisma.user.count as any)
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(5) // totalAdmins
        .mockResolvedValueOnce(80) // usersWithOnboarding
        .mockResolvedValueOnce(15); // recentUsers

      (prisma.resume.count as any).mockResolvedValue(200);

      const result = await service.getPlatformStatistics();

      expect(result).toEqual({
        users: {
          total: 100,
          admins: 5,
          regular: 95,
          withOnboarding: 80,
          recentSignups: 15,
        },
        resumes: {
          total: 200,
        },
      });
    });

    it('should filter admins correctly', async () => {
      (prisma.user.count as any).mockImplementation(
        (args: { where?: { role?: string } }) => {
          if (args?.where?.role === 'ADMIN') return Promise.resolve(3);
          return Promise.resolve(50);
        },
      );
      (prisma.resume.count as any).mockResolvedValue(100);

      await service.getPlatformStatistics();

      expect(prisma.user.count).toHaveBeenCalledWith({
        where: { role: 'ADMIN' },
      });
    });
  });
});
