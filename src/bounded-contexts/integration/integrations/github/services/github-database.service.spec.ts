/**
 * GitHub Database Service Tests
 * Focus: Database operations for GitHub sync
 *
 * Key scenarios:
 * - Resume ownership verification
 * - GitHub stats update
 * - Contribution/achievement reconciliation
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createMockResume } from '@test/factories/resume.factory';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { GitHubAchievementContent } from './github-achievement.service';
import type { GitHubContributionInput } from './github-contribution.service';
import { GitHubDatabaseService } from './github-database.service';

describe('GitHubDatabaseService', () => {
  let service: GitHubDatabaseService;
  let fakePrisma: {
    resume: {
      findUnique: ReturnType<typeof mock>;
      update: ReturnType<typeof mock>;
    };
    sectionItem: {
      deleteMany: ReturnType<typeof mock>;
      createMany: ReturnType<typeof mock>;
      count: ReturnType<typeof mock>;
    };
    sectionType: {
      findFirst: ReturnType<typeof mock>;
    };
    resumeSection: {
      upsert: ReturnType<typeof mock>;
    };
    $transaction: ReturnType<typeof mock>;
  };

  const mockResume = createMockResume({
    id: 'resume-123',
    userId: 'user-123',
    github: 'https://github.com/testuser',
  });

  beforeEach(async () => {
    fakePrisma = {
      resume: {
        findUnique: mock(() => Promise.resolve(mockResume)),
        update: mock(() => Promise.resolve(mockResume)),
      },
      sectionItem: {
        deleteMany: mock(() => Promise.resolve({ count: 0 })),
        createMany: mock(() => Promise.resolve({ count: 1 })),
        count: mock(() => Promise.resolve(0)),
      },
      sectionType: {
        findFirst: mock(() => Promise.resolve({ id: 'section-type-open-source' })),
      },
      resumeSection: {
        upsert: mock(() => Promise.resolve({ id: 'resume-section-open-source' })),
      },
      $transaction: mock((operations: unknown[]) => Promise.resolve(operations)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [GitHubDatabaseService, { provide: PrismaService, useValue: fakePrisma }],
    }).compile();

    service = module.get<GitHubDatabaseService>(GitHubDatabaseService);
  });

  describe('verifyResumeOwnership', () => {
    it('should return resume when user owns it', async () => {
      const result = await service.verifyResumeOwnership('user-123', 'resume-123');

      expect(result).toEqual(mockResume);
      expect(fakePrisma.resume.findUnique).toHaveBeenCalledWith({
        where: { id: 'resume-123' },
        include: undefined,
      });
    });

    it('should throw NOT_FOUND when resume does not exist', async () => {
      fakePrisma.resume.findUnique.mockResolvedValue(null);

      try {
        await service.verifyResumeOwnership('user-123', 'nonexistent');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.NOT_FOUND);
      }
    });

    it('should throw FORBIDDEN when user does not own resume', async () => {
      fakePrisma.resume.findUnique.mockResolvedValue({
        ...mockResume,
        userId: 'other-user',
      });

      try {
        await service.verifyResumeOwnership('user-123', 'resume-123');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.FORBIDDEN);
      }
    });

    it('should pass include options to query', async () => {
      const include = { resumeSections: true };

      await service.verifyResumeOwnership('user-123', 'resume-123', include);

      expect(fakePrisma.resume.findUnique).toHaveBeenCalledWith({
        where: { id: 'resume-123' },
        include,
      });
    });
  });

  describe('updateResumeGitHubStats', () => {
    it('should update resume with GitHub username and stars', async () => {
      await service.updateResumeGitHubStats('resume-123', 'testuser', 150);

      expect(fakePrisma.resume.update).toHaveBeenCalledWith({
        where: { id: 'resume-123' },
        data: {
          github: 'https://github.com/testuser',
          totalStars: 150,
        },
      });
    });
  });

  describe('reconcileDbEntries', () => {
    it('should execute transaction with delete and create operations', async () => {
      const contributions: GitHubContributionInput[] = [
        {
          resumeId: 'resume-123',
          projectName: 'test',
          projectUrl: 'https://github.com/test/repo',
          role: 'contributor',
          description: 'OSS contribution',
          technologies: ['TypeScript'],
          commits: 10,
          prsCreated: 2,
          stars: 20,
          startDate: new Date('2024-01-01'),
          isCurrent: true,
        },
      ];
      const achievements: GitHubAchievementContent[] = [
        {
          type: 'github_stars',
          title: 'Stars',
          description: 'Reached 100 stars',
          verificationUrl: 'https://github.com/testuser',
          achievedAt: new Date().toISOString(),
          value: 100,
        },
      ];

      await service.reconcileDbEntries('resume-123', 'testuser', contributions, achievements);

      expect(fakePrisma.$transaction).toHaveBeenCalled();
    });

    it('should skip createMany when no contributions', async () => {
      await service.reconcileDbEntries('resume-123', 'testuser', [], []);

      const transactionArg = fakePrisma.$transaction.mock.calls[0][0];
      // Should only have deleteMany operations, not createMany
      expect(transactionArg.length).toBe(2); // 2 deleteManyoperations
    });

    it('should delete existing GitHub contributions before creating new', async () => {
      const contributions: GitHubContributionInput[] = [
        {
          resumeId: 'resume-123',
          projectName: 'test',
          projectUrl: 'https://github.com/test/repo',
          role: 'contributor',
          description: 'OSS contribution',
          technologies: ['TypeScript'],
          commits: 10,
          prsCreated: 2,
          stars: 20,
          startDate: new Date('2024-01-01'),
          isCurrent: true,
        },
      ];

      await service.reconcileDbEntries('resume-123', 'testuser', contributions, []);

      expect(fakePrisma.sectionItem.deleteMany).toHaveBeenCalledWith({
        where: {
          resumeSection: {
            resumeId: 'resume-123',
            sectionType: {
              semanticKind: 'OPEN_SOURCE',
            },
          },
          content: {
            path: ['projectUrl'],
            string_contains: 'github.com',
          },
        },
      });
    });
  });
});
