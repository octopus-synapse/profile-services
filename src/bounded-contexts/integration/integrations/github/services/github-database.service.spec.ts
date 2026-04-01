/**
 * GitHub Database Service Tests
 * Focus: Database operations for GitHub sync
 *
 * Key scenarios:
 * - Resume ownership verification
 * - GitHub stats update
 * - Contribution/achievement reconciliation
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Prisma } from '@prisma/client';
import { createMockResume } from '@test/shared/factories/resume.factory';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  InMemoryResumeRepository,
  InMemoryResumeSectionRepository,
  InMemorySectionItemRepository,
  InMemorySectionTypeRepository,
  InMemoryTransactionHandler,
} from '../../../testing';
import type { GitHubAchievementContent } from './github-achievement.service';
import type { GitHubContributionInput } from './github-contribution.service';
import { GitHubDatabaseService } from './github-database.service';

describe('GitHubDatabaseService', () => {
  let service: GitHubDatabaseService;
  let resumeRepository: InMemoryResumeRepository;
  let sectionTypeRepository: InMemorySectionTypeRepository;
  let resumeSectionRepository: InMemoryResumeSectionRepository;
  let sectionItemRepository: InMemorySectionItemRepository;
  let transactionHandler: InMemoryTransactionHandler;

  const mockResume = createMockResume({
    id: 'resume-123',
    userId: 'user-123',
    github: 'https://github.com/testuser',
  });

  beforeEach(async () => {
    resumeRepository = new InMemoryResumeRepository();
    sectionTypeRepository = new InMemorySectionTypeRepository();
    resumeSectionRepository = new InMemoryResumeSectionRepository();
    sectionItemRepository = new InMemorySectionItemRepository();
    transactionHandler = new InMemoryTransactionHandler();

    // Seed initial data
    resumeRepository.seedResume(mockResume);
    sectionTypeRepository.seedSectionType({
      id: 'section-type-open-source',
      semanticKind: 'OPEN_SOURCE',
      isActive: true,
    });
    sectionTypeRepository.seedSectionType({
      id: 'section-type-achievement',
      semanticKind: 'ACHIEVEMENT',
      isActive: true,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitHubDatabaseService,
        {
          provide: PrismaService,
          useValue: {
            resume: {
              findUnique: (args: {
                where: { id: string };
                include?: { resumeSections?: boolean };
              }) => resumeRepository.findUnique(args.where.id, args.include),
              update: (args: { where: { id: string }; data: Record<string, unknown> }) =>
                resumeRepository.update(args.where.id, args.data),
            },
            sectionType: {
              findFirst: (args: { where: { semanticKind: string; isActive: boolean } }) =>
                sectionTypeRepository.findFirst(args.where.semanticKind),
            },
            resumeSection: {
              upsert: (args: {
                where: { resumeId_sectionTypeId: { resumeId: string; sectionTypeId: string } };
                update: Record<string, unknown>;
                create: { resumeId: string; sectionTypeId: string };
              }) =>
                resumeSectionRepository.upsert(
                  args.where.resumeId_sectionTypeId.resumeId,
                  args.where.resumeId_sectionTypeId.sectionTypeId,
                ),
            },
            sectionItem: {
              deleteMany: (args: { where: Record<string, unknown> }) => {
                const where = args.where;
                const filter: Parameters<typeof sectionItemRepository.deleteMany>[0] = {};

                if (where.resumeSection) {
                  const resumeSection = where.resumeSection as Record<string, unknown>;
                  if (resumeSection.resumeId) {
                    filter.resumeId = resumeSection.resumeId as string;
                  }
                  if (resumeSection.sectionType) {
                    const sectionType = resumeSection.sectionType as Record<string, unknown>;
                    if (sectionType.semanticKind) {
                      filter.semanticKind = sectionType.semanticKind as string;
                    }
                  }
                }

                if (where.content) {
                  const content = where.content as Record<string, unknown>;
                  if (content.path && content.string_contains) {
                    filter.contentFilter = {
                      path: content.path as string[],
                      value: content.string_contains as string,
                    };
                  }
                }

                return sectionItemRepository.deleteMany(filter);
              },
              createMany: (args: { data: Array<Record<string, unknown>> }) =>
                sectionItemRepository.createMany(
                  args.data.map((item) => ({
                    resumeSectionId: item.resumeSectionId as string,
                    order: item.order as number,
                    content: item.content as Prisma.JsonValue,
                  })),
                ),
              count: (args: { where: { resumeSectionId: string } }) =>
                sectionItemRepository.count(args.where.resumeSectionId),
            },
            $transaction: (operations: Array<Promise<unknown>>) =>
              transactionHandler.execute(operations.map((op) => () => op)),
          },
        },
      ],
    }).compile();

    service = module.get<GitHubDatabaseService>(GitHubDatabaseService);
  });

  describe('verifyResumeOwnership', () => {
    it('should return resume when user owns it', async () => {
      const result = await service.verifyResumeOwnership('user-123', 'resume-123');

      expect(result).toEqual(mockResume);
    });

    it('should throw NOT_FOUND when resume does not exist', async () => {
      resumeRepository.clear();

      try {
        await service.verifyResumeOwnership('user-123', 'nonexistent');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.NOT_FOUND);
      }
    });

    it('should throw FORBIDDEN when user does not own resume', async () => {
      resumeRepository.clear();
      resumeRepository.seedResume({
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

      const result = await service.verifyResumeOwnership('user-123', 'resume-123', include);

      expect(result).toBeDefined();
    });
  });

  describe('updateResumeGitHubStats', () => {
    it('should update resume with GitHub username and stars', async () => {
      await service.updateResumeGitHubStats('resume-123', 'testuser', 150);

      const updated = resumeRepository.getResume('resume-123');
      expect(updated?.github).toBe('https://github.com/testuser');
      expect(updated?.totalStars).toBe(150);
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

      const items = sectionItemRepository.getItems();
      expect(items.length).toBeGreaterThan(0);
    });

    it('should skip createMany when no contributions', async () => {
      await service.reconcileDbEntries('resume-123', 'testuser', [], []);

      const items = sectionItemRepository.getItems();
      expect(items.length).toBe(0);
    });

    it('should delete existing GitHub contributions before creating new', async () => {
      // Seed an existing GitHub contribution
      const resumeSection = await resumeSectionRepository.upsert(
        'resume-123',
        'section-type-open-source',
      );
      await sectionItemRepository.createMany([
        {
          resumeSectionId: resumeSection.id,
          order: 0,
          content: {
            projectName: 'old-project',
            projectUrl: 'https://github.com/old/repo',
          },
        },
      ]);

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

      const items = sectionItemRepository.getItems();
      // Old item should be deleted and new one created
      expect(items.length).toBe(1);
      const content = items[0].content as Record<string, unknown>;
      expect(content.projectName).toBe('test');
    });
  });
});
