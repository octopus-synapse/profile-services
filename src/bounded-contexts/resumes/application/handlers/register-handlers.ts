/**
 * Explicit registration of resumes-BC event handlers.
 *
 * Handlers are framework-free POJOs (`*.handler.ts`); this file wires
 * each one to the `EventBusPort` via `bus.on(EventClass.TYPE, ...)`.
 * Called from the BC's Nest module via a side-effect provider.
 */

import { UserDeletedEvent } from '@/bounded-contexts/identity/shared-kernel/domain/events';
import type { CacheInvalidationService } from '@/bounded-contexts/platform/common/cache/services/cache-invalidation.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { EventBusPort, LoggerPort } from '@/shared-kernel';
import { ResumeDeletedEvent, ResumeUpdatedEvent } from '../../domain/events';
import { CleanupResumesOnUserDeleteHandler } from './cleanup-resumes-on-user-delete.handler';
import { InvalidateCacheOnResumeDelete } from './invalidate-cache-on-resume-delete.handler';
import { InvalidateCacheOnResumeUpdate } from './invalidate-cache-on-resume-update.handler';

export interface ResumesHandlersDeps {
  readonly eventBus: EventBusPort;
  readonly cacheInvalidation: CacheInvalidationService;
  readonly prisma: PrismaService;
  readonly logger: LoggerPort;
}

export function registerResumesHandlers(deps: ResumesHandlersDeps): void {
  const { eventBus, cacheInvalidation, prisma, logger } = deps;

  const onUpdate = new InvalidateCacheOnResumeUpdate(cacheInvalidation, logger);
  eventBus.on(ResumeUpdatedEvent.TYPE, onUpdate.handle.bind(onUpdate));

  const onDelete = new InvalidateCacheOnResumeDelete(cacheInvalidation, logger);
  eventBus.on(ResumeDeletedEvent.TYPE, onDelete.handle.bind(onDelete));

  const cleanup = new CleanupResumesOnUserDeleteHandler(prisma, logger);
  eventBus.on(UserDeletedEvent.TYPE, cleanup.handle.bind(cleanup));
}
