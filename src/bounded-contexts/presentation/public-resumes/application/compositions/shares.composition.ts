/**
 * Shares Composition
 *
 * Wires share use cases with their dependencies following Clean Architecture.
 */

import type { CacheCoreService } from '@/bounded-contexts/platform/common/cache/services/cache-core.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { EventPublisher } from '@/shared-kernel';
import { ResumeReadRepository } from '../../infrastructure/adapters/persistence/resume-read.repository';
import { ShareRepository } from '../../infrastructure/adapters/persistence/share.repository';
import { SHARE_USE_CASES, type ShareUseCases } from '../ports/shares.port';
import { CreateShareUseCase } from '../use-cases/create-share.use-case';
import { DeleteShareUseCase } from '../use-cases/delete-share.use-case';
import { GetShareBySlugUseCase } from '../use-cases/get-share-by-slug.use-case';
import { ListUserSharesUseCase } from '../use-cases/list-user-shares.use-case';

export { SHARE_USE_CASES };

export function buildShareUseCases(
  prisma: PrismaService,
  cache: CacheCoreService,
  eventPublisher: EventPublisher,
): ShareUseCases {
  const shareRepo = new ShareRepository(prisma);
  const resumeRepo = new ResumeReadRepository(prisma);

  // Wrap CacheCoreService as CachePort
  const cachePort = {
    get: <T>(key: string) => cache.get<T>(key),
    set: (key: string, value: unknown, ttlSeconds?: number) => cache.set(key, value, ttlSeconds),
  };

  return {
    createShareUseCase: new CreateShareUseCase(shareRepo, resumeRepo, eventPublisher),
    getShareBySlugUseCase: new GetShareBySlugUseCase(shareRepo, resumeRepo, cachePort),
    deleteShareUseCase: new DeleteShareUseCase(shareRepo),
    listUserSharesUseCase: new ListUserSharesUseCase(shareRepo, resumeRepo),
  };
}
