import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CacheInvalidationService } from '@/bounded-contexts/platform/common/cache/services/cache-invalidation.service';
import { ResumeDeletedEvent } from '../../domain/events';

@Injectable()
export class InvalidateCacheOnResumeDelete {
  private readonly logger = new Logger(InvalidateCacheOnResumeDelete.name);

  constructor(private readonly cacheInvalidation: CacheInvalidationService) {}

  @OnEvent(ResumeDeletedEvent.TYPE)
  async handle(event: ResumeDeletedEvent): Promise<void> {
    this.logger.log(
      `Invalidating cache for deleted resume: ${event.aggregateId}`,
    );

    await this.cacheInvalidation.invalidateResume({
      resumeId: event.aggregateId,
      userId: event.payload.userId,
    });
  }
}
