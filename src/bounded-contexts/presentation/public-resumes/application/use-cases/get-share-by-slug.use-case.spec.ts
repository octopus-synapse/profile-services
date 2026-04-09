import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { CachePort } from '../../domain/ports/cache.port';
import type { ResumeReadRepositoryPort } from '../../domain/ports/resume-read.repository.port';
import type { ShareRepositoryPort, ShareWithResume } from '../../domain/ports/share.repository.port';
import { GetShareBySlugUseCase } from './get-share-by-slug.use-case';

describe('GetShareBySlugUseCase', () => {
  let useCase: GetShareBySlugUseCase;
  let shareRepo: Record<string, ReturnType<typeof mock>>;
  let resumeRepo: Record<string, ReturnType<typeof mock>>;
  let cache: Record<string, ReturnType<typeof mock>>;

  const shareWithResume: ShareWithResume = {
    id: 'share-1',
    resumeId: 'resume-123',
    slug: 'my-slug',
    password: null,
    expiresAt: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    resume: { id: 'resume-123', userId: 'user-123' },
  };

  beforeEach(() => {
    shareRepo = {
      findBySlug: mock(() => Promise.resolve(shareWithResume)),
    };

    resumeRepo = {
      findByIdWithSections: mock(() =>
        Promise.resolve({
          id: 'resume-123',
          userId: 'user-123',
          title: 'My Resume',
          resumeSections: [
            {
              sectionType: { semanticKind: 'SKILL_SET' },
              items: [{ content: { name: 'TypeScript' } }],
            },
          ],
        }),
      ),
    };

    cache = {
      get: mock(() => Promise.resolve(null)),
      set: mock(() => Promise.resolve()),
    };

    useCase = new GetShareBySlugUseCase(
      shareRepo as unknown as ShareRepositoryPort,
      resumeRepo as unknown as ResumeReadRepositoryPort,
      cache as unknown as CachePort,
    );
  });

  describe('execute', () => {
    it('should return a share with resume by slug', async () => {
      const result = await useCase.execute('my-slug');

      expect(result).toBeDefined();
      expect(result?.slug).toBe('my-slug');
      expect(result?.resume).toBeDefined();
      expect(shareRepo.findBySlug).toHaveBeenCalledWith('my-slug');
    });

    it('should return null when slug does not exist', async () => {
      shareRepo.findBySlug = mock(() => Promise.resolve(null));

      const result = await useCase.execute('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getResumeWithCache', () => {
    it('should return cached resume when available', async () => {
      const cachedResume = { id: 'resume-123', title: 'Cached' };
      cache.get = mock(() => Promise.resolve(cachedResume));

      const result = await useCase.getResumeWithCache('resume-123');

      expect(result).toEqual(cachedResume);
      expect(cache.get).toHaveBeenCalledWith('public:resume:resume-123');
      expect(resumeRepo.findByIdWithSections).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache on cache miss', async () => {
      const result = await useCase.getResumeWithCache('resume-123');

      expect(result).toBeDefined();
      expect(resumeRepo.findByIdWithSections).toHaveBeenCalledWith('resume-123');
      expect(cache.set).toHaveBeenCalledWith(
        'public:resume:resume-123',
        expect.objectContaining({ id: 'resume-123' }),
        60,
      );
    });

    it('should transform sections into generic format', async () => {
      const result = (await useCase.getResumeWithCache('resume-123')) as {
        sections: Array<{ semanticKind: string; items: unknown[] }>;
      };

      expect(result).toBeDefined();
      expect(result.sections).toBeDefined();
      expect(result.sections[0].semanticKind).toBe('SKILL_SET');
      expect(result.sections[0].items).toEqual([{ name: 'TypeScript' }]);
    });

    it('should return null when resume is not found in database', async () => {
      resumeRepo.findByIdWithSections = mock(() => Promise.resolve(null));

      const result = await useCase.getResumeWithCache('nonexistent');

      expect(result).toBeNull();
      expect(cache.set).not.toHaveBeenCalled();
    });
  });

  describe('verifyPassword', () => {
    it('should return true for a valid password', async () => {
      const hash = await Bun.password.hash('correct-password', {
        algorithm: 'bcrypt',
        cost: 4,
      });

      const result = await useCase.verifyPassword('correct-password', hash);

      expect(result).toBe(true);
    });

    it('should return false for an invalid password', async () => {
      const hash = await Bun.password.hash('correct-password', {
        algorithm: 'bcrypt',
        cost: 4,
      });

      const result = await useCase.verifyPassword('wrong-password', hash);

      expect(result).toBe(false);
    });
  });
});
