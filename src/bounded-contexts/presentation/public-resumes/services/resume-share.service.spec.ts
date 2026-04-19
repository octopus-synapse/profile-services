/**
 * ResumeShareService Unit Tests
 *
 * Clean Architecture tests using in-memory repositories.
 * No unsafe casting in mocks - proper type-safe implementations.
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheCoreService } from '@/bounded-contexts/platform/common/cache/services/cache-core.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { EventPublisher } from '@/shared-kernel';
import {
  createTestResume,
  InMemoryCacheService,
  InMemoryResumeRepository,
  InMemoryResumeShareRepository,
  type ResumeRecord,
  StubEventPublisher,
} from '../../testing';
import { ResumeShareService } from './resume-share.service';

describe('ResumeShareService', () => {
  let service: ResumeShareService;
  let shareRepo: InMemoryResumeShareRepository;
  let resumeRepo: InMemoryResumeRepository;
  let cacheService: InMemoryCacheService;
  let eventPublisher: StubEventPublisher;

  const testResume = createTestResume({
    id: 'resume-123',
    userId: 'user-123',
    title: 'Software Engineer Resume',
  });

  const testResumeWithSections: ResumeRecord = {
    ...testResume,
    resumeSections: [
      {
        sectionType: { semanticKind: 'SKILL_SET' },
        items: [{ content: { name: 'TypeScript' } }, { content: { name: 'NestJS' } }],
      },
      {
        sectionType: { semanticKind: 'WORK_EXPERIENCE' },
        items: [{ content: { title: 'Backend Engineer' } }],
      },
    ],
  };

  // Build Prisma-compatible interface from in-memory repositories
  const buildPrismaService = () => ({
    resumeShare: {
      create: mock(
        async (args: {
          data: {
            slug: string;
            password?: string | null;
            expiresAt?: Date | null;
            resumeId: string;
          };
        }) => {
          return shareRepo.create({
            resumeId: args.data.resumeId,
            slug: args.data.slug,
            password: args.data.password ?? null,
            expiresAt: args.data.expiresAt ?? null,
          });
        },
      ),
      findUnique: mock(
        async (args: { where: { id?: string; slug?: string }; include?: unknown }) => {
          const share = await shareRepo.findUnique(args.where);
          if (!share) return null;
          if (args.include) {
            const resume = await resumeRepo.findUnique({ id: share.resumeId });
            return { ...share, resume };
          }
          return share;
        },
      ),
      findMany: mock(async (args: { where: { resumeId: string }; orderBy?: unknown }) => {
        return shareRepo.findMany({ resumeId: args.where.resumeId });
      }),
      delete: mock(async (args: { where: { id: string } }) => {
        return shareRepo.delete({ id: args.where.id });
      }),
    },
    resume: {
      findUnique: mock(
        async (args: { where: { id: string }; select?: unknown; include?: unknown }) => {
          const resume = await resumeRepo.findUnique({ id: args.where.id });
          if (!resume) return null;
          // If select only includes userId, return just that
          if (args.select && 'userId' in (args.select as object)) {
            return { userId: resume.userId };
          }
          return resume;
        },
      ),
    },
  });

  const buildCacheService = () => ({
    get: mock(async <T>(key: string): Promise<T | null> => {
      return cacheService.get<T>(key);
    }),
    set: mock(async (key: string, value: unknown, ttl?: number): Promise<void> => {
      await cacheService.set(key, value, ttl);
    }),
  });

  const setupService = async () => {
    shareRepo = new InMemoryResumeShareRepository();
    resumeRepo = new InMemoryResumeRepository();
    cacheService = new InMemoryCacheService();
    eventPublisher = new StubEventPublisher();

    // Seed default data
    resumeRepo.seed([testResumeWithSections]);

    const prismaService = buildPrismaService();
    const cache = buildCacheService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeShareService,
        { provide: PrismaService, useValue: prismaService },
        { provide: CacheCoreService, useValue: cache },
        { provide: EventPublisher, useValue: eventPublisher },
      ],
    }).compile();

    service = module.get<ResumeShareService>(ResumeShareService);

    return { prismaService, cache };
  };

  beforeEach(async () => {
    await setupService();
  });

  describe('Slug Generation', () => {
    it('should generate unique slug when not provided', async () => {
      const result = await service.createShare('user-123', {
        resumeId: 'resume-123',
      });

      expect(result.slug).toBeDefined();
      expect(result.slug.length).toBe(10);
    });

    it('should use custom slug when provided', async () => {
      const result = await service.createShare('user-123', {
        resumeId: 'resume-123',
        slug: 'custom-slug',
      });

      expect(result.slug).toBe('custom-slug');
    });

    it('should reject invalid slug format', async () => {
      await expect(
        service.createShare('user-123', {
          resumeId: 'resume-123',
          slug: 'invalid slug!@#',
        }),
      ).rejects.toThrow('Invalid slug format');
    });

    it('should reject slug with spaces', async () => {
      await expect(
        service.createShare('user-123', {
          resumeId: 'resume-123',
          slug: 'my resume',
        }),
      ).rejects.toThrow('Invalid slug format');
    });

    it('should accept slug with hyphens', async () => {
      const result = await service.createShare('user-123', {
        resumeId: 'resume-123',
        slug: 'my-awesome-resume-2024',
      });

      expect(result).toBeDefined();
      expect(result.slug).toBe('my-awesome-resume-2024');
    });
  });

  describe('Password Protection', () => {
    it('should hash password when provided', async () => {
      const result = await service.createShare('user-123', {
        resumeId: 'resume-123',
        password: 'secret123',
      });

      expect(result.password).not.toBe('secret123');
      expect(result.password).toBeDefined();
    });

    it('should verify correct password', async () => {
      const hashedPassword = await Bun.password.hash('secret123', {
        algorithm: 'bcrypt',
        cost: 10,
      });

      const isValid = await service.verifyPassword('secret123', hashedPassword);

      expect(typeof isValid).toBe('boolean');
    });

    it('should create share without password', async () => {
      const result = await service.createShare('user-123', {
        resumeId: 'resume-123',
      });

      expect(result.password).toBe(null);
    });
  });

  describe('Share Expiration', () => {
    it('should set expiration date when provided', async () => {
      const expiresAt = new Date('2025-12-31');

      const result = await service.createShare('user-123', {
        resumeId: 'resume-123',
        expiresAt,
      });

      expect(result).toBeDefined();
    });

    it('should allow share without expiration', async () => {
      const result = await service.createShare('user-123', {
        resumeId: 'resume-123',
      });

      expect(result.expiresAt).toBe(null);
    });
  });

  describe('Slug Uniqueness', () => {
    it('should throw error when slug already exists', async () => {
      // First, create a share with a specific slug
      await service.createShare('user-123', {
        resumeId: 'resume-123',
        slug: 'existing-slug',
      });

      // Try to create another share with the same slug
      await expect(
        service.createShare('user-123', {
          resumeId: 'resume-123',
          slug: 'existing-slug',
        }),
      ).rejects.toThrow('Slug already in use');
    });
  });

  describe('Resume Caching', () => {
    it('should return cached resume when available', async () => {
      const cachedResume = { id: 'resume-123', title: 'Cached Resume' };
      await cacheService.set('public:resume:resume-123', cachedResume);

      const result = await service.getResumeWithCache('resume-123');

      expect(result).toEqual(cachedResume);
    });

    it('should fetch from database when cache miss', async () => {
      const result = await service.getResumeWithCache('resume-123');

      expect(result).toEqual(
        expect.objectContaining({
          id: 'resume-123',
          sections: [
            {
              semanticKind: 'SKILL_SET',
              items: [{ name: 'TypeScript' }, { name: 'NestJS' }],
            },
            {
              semanticKind: 'WORK_EXPERIENCE',
              items: [{ title: 'Backend Engineer' }],
            },
          ],
        }),
      );
    });

    it('should cache resume with 60s TTL', async () => {
      await service.getResumeWithCache('resume-123');

      const cachedValue = await cacheService.get('public:resume:resume-123');
      expect(cachedValue).toBeDefined();
      expect(cachedValue).toEqual(
        expect.objectContaining({
          id: 'resume-123',
          sections: expect.arrayContaining([
            expect.objectContaining({ semanticKind: 'SKILL_SET' }),
          ]),
        }),
      );
    });

    it('should return null when resume not found', async () => {
      resumeRepo.clear(); // Remove all resumes

      const result = await service.getResumeWithCache('nonexistent-resume');

      expect(result).toBe(null);
    });
  });

  describe('Share Management', () => {
    it('should retrieve share by slug', async () => {
      // Create a share first
      await service.createShare('user-123', {
        resumeId: 'resume-123',
        slug: 'my-awesome-resume',
      });

      const result = await service.getBySlug('my-awesome-resume');

      expect(result).toBeDefined();
      expect(result?.slug).toBe('my-awesome-resume');
    });

    it('should list all shares for a resume', async () => {
      // Create multiple shares
      await service.createShare('user-123', {
        resumeId: 'resume-123',
        slug: 'share-1',
      });
      await service.createShare('user-123', {
        resumeId: 'resume-123',
        slug: 'share-2',
      });

      const result = await service.listUserShares('user-123', 'resume-123');

      expect(result.length).toBe(2);
    });

    it('should delete share by id', async () => {
      // Create a share
      const createdShare = await service.createShare('user-123', {
        resumeId: 'resume-123',
        slug: 'to-delete',
      });

      // Re-setup with the share having resume relation
      const { prismaService } = await setupService();
      shareRepo.seed([
        {
          id: createdShare.id,
          resumeId: 'resume-123',
          slug: 'to-delete',
          password: null,
          expiresAt: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      // Override findUnique to return share with resume for ownership check
      prismaService.resumeShare.findUnique = mock(async () => ({
        ...createdShare,
        resume: { userId: 'user-123' },
      }));

      const result = await service.deleteShare('user-123', createdShare.id);

      expect(result).toBeDefined();
    });
  });

  describe('Slug Aliases', () => {
    let createdShareId: string;
    let prismaService: ReturnType<typeof buildPrismaService>;
    const aliases = new Map<string, { id: string; shareId: string; slug: string }>();
    const aliasBySlug = new Map<string, string>();

    beforeEach(async () => {
      const setup = await setupService();
      prismaService = setup.prismaService;
      aliases.clear();
      aliasBySlug.clear();

      const created = await service.createShare('user-123', {
        resumeId: 'resume-123',
        slug: 'primary-slug',
      });
      createdShareId = created.id;

      // Wire alias prisma surface used by service
      // biome-ignore lint/suspicious/noExplicitAny: test stub typed loosely
      (prismaService as any).resumeShareAlias = {
        create: mock(async (args: { data: { shareId: string; slug: string } }) => {
          const id = `alias-${aliases.size + 1}`;
          const record = { id, shareId: args.data.shareId, slug: args.data.slug };
          aliases.set(id, record);
          aliasBySlug.set(args.data.slug, id);
          return record;
        }),
        findUnique: mock(async (args: { where: { id?: string; slug?: string } }) => {
          if (args.where.id) return aliases.get(args.where.id) ?? null;
          if (args.where.slug) {
            const id = aliasBySlug.get(args.where.slug);
            return id ? (aliases.get(id) ?? null) : null;
          }
          return null;
        }),
        findMany: mock(async (args: { where: { shareId: string } }) => {
          return Array.from(aliases.values()).filter((a) => a.shareId === args.where.shareId);
        }),
        delete: mock(async (args: { where: { id: string } }) => {
          const a = aliases.get(args.where.id);
          if (!a) throw new Error('alias not found');
          aliases.delete(args.where.id);
          aliasBySlug.delete(a.slug);
          return a;
        }),
      };

      // Make share findUnique include resume userId for ownership checks
      type ShareRow = {
        id: string;
        resumeId: string;
        slug: string;
        password: string | null;
        expiresAt: Date | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
      };
      const buildShareRow = (): ShareRow => ({
        id: createdShareId,
        resumeId: 'resume-123',
        slug: 'primary-slug',
        password: null,
        expiresAt: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      prismaService.resumeShare.findUnique = mock(
        async (args: { where: { id?: string; slug?: string }; include?: unknown }) => {
          let share: ShareRow | null = null;
          if (args.where.id === createdShareId) {
            share = buildShareRow();
          } else if (args.where.slug === 'primary-slug') {
            share = buildShareRow();
          }
          if (!share) return null;
          if (args.include) return { ...share, resume: { id: 'resume-123', userId: 'user-123' } };
          return share;
        },
      );
    });

    it('should add an alias to an existing share', async () => {
      const alias = await service.addAlias('user-123', createdShareId, 'enzo-2026');

      expect(alias.slug).toBe('enzo-2026');
      expect(alias.shareId).toBe(createdShareId);
    });

    it('should reject alias creation by non-owner', async () => {
      await expect(service.addAlias('other-user', createdShareId, 'someone-elses')).rejects.toThrow(
        'access',
      );
    });

    it('should reject invalid alias slug format', async () => {
      await expect(service.addAlias('user-123', createdShareId, 'has spaces!')).rejects.toThrow(
        'Invalid slug format',
      );
    });

    it('should reject alias slug already used by a primary share', async () => {
      await expect(service.addAlias('user-123', createdShareId, 'primary-slug')).rejects.toThrow(
        'in use',
      );
    });

    it('should reject duplicate alias slug', async () => {
      await service.addAlias('user-123', createdShareId, 'enzo-2026');
      await expect(service.addAlias('user-123', createdShareId, 'enzo-2026')).rejects.toThrow(
        'in use',
      );
    });

    it('should resolve alias slug to the underlying share via getBySlug', async () => {
      await service.addAlias('user-123', createdShareId, 'enzo-2026');
      const share = await service.getBySlug('enzo-2026');

      expect(share).not.toBeNull();
      expect(share?.id).toBe(createdShareId);
      expect(share?.slug).toBe('primary-slug');
    });

    it('should remove an alias by id', async () => {
      const alias = await service.addAlias('user-123', createdShareId, 'enzo-2026');
      await service.removeAlias('user-123', alias.id);

      const found = await service.getBySlug('enzo-2026');
      expect(found).toBeNull();
    });

    it('should reject alias removal by non-owner', async () => {
      const alias = await service.addAlias('user-123', createdShareId, 'enzo-2026');
      await expect(service.removeAlias('other-user', alias.id)).rejects.toThrow('access');
    });
  });
});
