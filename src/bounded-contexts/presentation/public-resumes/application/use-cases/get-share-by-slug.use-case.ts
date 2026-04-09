/**
 * Get Share By Slug Use Case
 *
 * Also handles resume caching and password verification.
 */

import { toGenericSections } from '@/shared-kernel/schemas/sections';
import type { CachePort } from '../../domain/ports/cache.port';
import type { ResumeReadRepositoryPort } from '../../domain/ports/resume-read.repository.port';
import type {
  ShareRepositoryPort,
  ShareWithResume,
} from '../../domain/ports/share.repository.port';

const CACHE_TTL = 60; // 60 seconds

export class GetShareBySlugUseCase {
  constructor(
    private readonly shareRepo: ShareRepositoryPort,
    private readonly resumeRepo: ResumeReadRepositoryPort,
    private readonly cache: CachePort,
  ) {}

  async execute(slug: string): Promise<ShareWithResume | null> {
    return this.shareRepo.findBySlug(slug);
  }

  async getResumeWithCache(resumeId: string) {
    const cacheKey = `public:resume:${resumeId}`;

    const cached = await this.cache.get<unknown>(cacheKey);
    if (cached) {
      return cached;
    }

    const resume = await this.resumeRepo.findByIdWithSections(resumeId);
    if (!resume) {
      return null;
    }

    const { resumeSections, ...resumeData } = resume;
    const sections = toGenericSections(
      resumeSections as Array<{
        sectionType: { semanticKind: string };
        items: Array<{ content: unknown }>;
      }>,
    );

    const resumeToCache = {
      ...resumeData,
      sections: sections.map((section) => ({
        semanticKind: section.semanticKind,
        items: section.items.map((item) => item.content),
      })),
    };

    await this.cache.set(cacheKey, resumeToCache, CACHE_TTL);

    return resumeToCache;
  }

  async verifyPassword(plaintext: string, hash: string): Promise<boolean> {
    return Bun.password.verify(plaintext, hash);
  }
}
