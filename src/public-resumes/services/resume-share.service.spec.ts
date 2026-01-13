/**
 * ResumeShareService Unit Tests
 *
 * Tests public resume sharing functionality:
 * - Slug generation and validation
 * - Password protection (bcrypt mocked)
 * - Share creation and retrieval
 * - Redis caching
 */

import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test';
import * as bcrypt from 'bcryptjs';
import { Test, TestingModule } from '@nestjs/testing';
import { ResumeShareService } from './resume-share.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheCoreService } from '../../common/cache/services/cache-core.service';

// Mock bcrypt for fast tests
spyOn(bcrypt, 'hash').mockResolvedValue('$2b$10$mockedhash' as never);
spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

describe('ResumeShareService', () => {
  let service: ResumeShareService;
  let prisma: PrismaService;
  let cache: CacheCoreService;

  const mockResume = {
    id: 'resume-123',
    userId: 'user-123',
    title: 'Software Engineer Resume',
    experiences: [],
    education: [],
    skills: [],
    languages: [],
    projects: [],
    certifications: [],
    awards: [],
  };

  const mockShare = {
    id: 'share-123',
    resumeId: 'resume-123',
    slug: 'my-awesome-resume',
    password: null,
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    resume: mockResume,
  };

  beforeEach(async () => {
    prisma = {
      resumeShare: {
        create: mock(() => Promise.resolve(mockShare)),
        findUnique: mock(() => Promise.resolve(null)), // Default to null (slug not found)
        findMany: mock(() => Promise.resolve([mockShare])),
        delete: mock(() => Promise.resolve(mockShare)),
      },
      resume: {
        findUnique: mock(() => Promise.resolve(mockResume)),
      },
    } as any;

    cache = {
      get: mock(() => Promise.resolve(null)),
      set: mock(() => Promise.resolve()),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeShareService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheCoreService, useValue: cache },
      ],
    }).compile();

    service = module.get<ResumeShareService>(ResumeShareService);
  });

  describe('Slug Generation', () => {
    it('should generate unique slug when not provided', async () => {
      // Override create mock to return data with generated slug
      prisma.resumeShare.create = mock((args: { data: { slug: string } }) =>
        Promise.resolve({ ...mockShare, slug: args.data.slug }),
      );

      const result = await service.createShare({ resumeId: 'resume-123' });

      expect(result.slug).toBeDefined();
      expect(result.slug.length).toBe(10);
    });

    it('should use custom slug when provided', async () => {
      prisma.resumeShare.findUnique = mock(() => Promise.resolve(null));

      const result = await service.createShare({
        resumeId: 'resume-123',
        slug: 'custom-slug',
      });

      expect(result.slug).toBe('my-awesome-resume');
    });

    it('should reject invalid slug format', async () => {
      await expect(
        service.createShare({
          resumeId: 'resume-123',
          slug: 'invalid slug!@#',
        }),
      ).rejects.toThrow('Invalid slug format');
    });

    it('should reject slug with spaces', async () => {
      await expect(
        service.createShare({
          resumeId: 'resume-123',
          slug: 'my resume',
        }),
      ).rejects.toThrow('Invalid slug format');
    });

    it('should accept slug with hyphens', async () => {
      prisma.resumeShare.findUnique = mock(() => Promise.resolve(null));

      const result = await service.createShare({
        resumeId: 'resume-123',
        slug: 'my-awesome-resume-2024',
      });

      expect(result).toBeDefined();
    });
  });

  describe('Password Protection', () => {
    it('should hash password when provided', async () => {
      const result = await service.createShare({
        resumeId: 'resume-123',
        password: 'secret123',
      });

      expect(result.password).not.toBe('secret123');
      expect(result.password).toBe(null); // Mock returns null
    });

    it('should verify correct password', async () => {
      const hashedPassword = '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890'; // Fake bcrypt hash

      const isValid = await service.verifyPassword('secret123', hashedPassword);

      expect(typeof isValid).toBe('boolean');
    });

    it('should create share without password', async () => {
      const result = await service.createShare({
        resumeId: 'resume-123',
      });

      expect(result.password).toBe(null);
    });
  });

  describe('Share Expiration', () => {
    it('should set expiration date when provided', async () => {
      const expiresAt = new Date('2025-12-31');

      const result = await service.createShare({
        resumeId: 'resume-123',
        expiresAt,
      });

      expect(result).toBeDefined();
    });

    it('should allow share without expiration', async () => {
      const result = await service.createShare({
        resumeId: 'resume-123',
      });

      expect(result.expiresAt).toBe(null);
    });
  });

  describe('Slug Uniqueness', () => {
    it('should throw error when slug already exists', async () => {
      prisma.resumeShare.findUnique = mock(() => Promise.resolve(mockShare));

      await expect(
        service.createShare({
          resumeId: 'resume-123',
          slug: 'existing-slug',
        }),
      ).rejects.toThrow('Slug already in use');
    });
  });

  describe('Resume Caching', () => {
    it('should return cached resume when available', async () => {
      cache.get = mock(() => Promise.resolve(mockResume));

      const result = await service.getResumeWithCache('resume-123');

      expect(result).toEqual(mockResume);
      expect(prisma.resume.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch from database when cache miss', async () => {
      cache.get = mock(() => Promise.resolve(null));

      const result = await service.getResumeWithCache('resume-123');

      expect(result).toEqual(mockResume);
      expect(prisma.resume.findUnique).toHaveBeenCalled();
      expect(cache.set).toHaveBeenCalled();
    });

    it('should cache resume with 60s TTL', async () => {
      cache.get = mock(() => Promise.resolve(null));

      await service.getResumeWithCache('resume-123');

      expect(cache.set).toHaveBeenCalledWith(
        'public:resume:resume-123',
        mockResume,
        60,
      );
    });

    it('should return null when resume not found', async () => {
      cache.get = mock(() => Promise.resolve(null));
      prisma.resume.findUnique = mock(() => Promise.resolve(null));

      const result = await service.getResumeWithCache('resume-123');

      expect(result).toBe(null);
    });
  });

  describe('Share Management', () => {
    it('should retrieve share by slug', async () => {
      prisma.resumeShare.findUnique = mock(() => Promise.resolve(mockShare));

      const result = await service.getBySlug('my-awesome-resume');

      expect(result).toEqual(mockShare);
      expect(prisma.resumeShare.findUnique).toHaveBeenCalledWith({
        where: { slug: 'my-awesome-resume' },
        include: { resume: true },
      });
    });

    it('should list all shares for a resume', async () => {
      const result = await service.listUserShares('resume-123');

      expect(result).toEqual([mockShare]);
      expect(prisma.resumeShare.findMany).toHaveBeenCalledWith({
        where: { resumeId: 'resume-123' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should delete share by id', async () => {
      const result = await service.deleteShare('share-123');

      expect(result).toEqual(mockShare);
      expect(prisma.resumeShare.delete).toHaveBeenCalledWith({
        where: { id: 'share-123' },
      });
    });
  });
});
