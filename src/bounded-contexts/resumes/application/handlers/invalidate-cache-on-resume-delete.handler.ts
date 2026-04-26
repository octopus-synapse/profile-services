import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CacheInvalidationService } from '@/bounded-contexts/platform/common/cache/services/cache-invalidation.service';
import { LoggerPort } from '@/shared-kernel';
import { ResumeDeletedEvent } from '../../domain/events';

const CTX = 'InvalidateCacheOnResumeDelete';

@Injectable()
export class InvalidateCacheOnResumeDelete {
  constructor(
    private readonly cacheInvalidation: CacheInvalidationService,
    private readonly logger: LoggerPort,
  ) {}

  @OnEvent(ResumeDeletedEvent.TYPE)
  async handle(event: ResumeDeletedEvent): Promise<void> {
    this.logger.log(`Invalidating cache for deleted resume: ${event.aggregateId}`, CTX);

    await this.cacheInvalidation.invalidateResume({
      resumeId: event.aggregateId,
      userId: event.payload.userId,
    });
  }
}
