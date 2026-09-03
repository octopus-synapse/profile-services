import { describe, expect, it, mock } from 'bun:test';
import type { CachePort } from '@/shared-kernel/cache/cache.port';
import { publicResumeCacheKey } from '@/shared-kernel/cache/public-resume-cache-key';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { CacheInvalidationService } from './cache-invalidation.service';

function makeCache() {
  const deleted: string[] = [];
  const patterns: string[] = [];
  const cache = {
    delete: mock(async (key: string) => void deleted.push(key)),
    deletePattern: mock(async (pattern: string) => void patterns.push(pattern)),
  } as unknown as CachePort;
  return { cache, deleted, patterns };
}

describe('CacheInvalidationService.invalidateResume', () => {
  it('drops the public payload under the shared key builder, never a slug-spelled key', async () => {
    const { cache, deleted } = makeCache();
    const service = new CacheInvalidationService(cache, stubLogger);

    await service.invalidateResume({ resumeId: 'resume-1', slug: 'my-slug', userId: 'user-1' });

    expect(deleted).toContain(publicResumeCacheKey('resume-1'));
    expect(deleted).not.toContain('public:resume:my-slug');
    expect(deleted.filter((k) => k.startsWith('public:resume:'))).toHaveLength(1);
  });
});
