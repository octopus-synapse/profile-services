import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CacheInvalidationService } from '@/bounded-contexts/platform/common/cache/services/cache-invalidation.service';
import { ResumeUpdatedEvent } from '../../domain/events';

@Injectable()
export class InvalidateCacheOnResumeUpdate {
  private readonly logger = new Logger(InvalidateCacheOnResumeUpdate.name);

  constructor(private readonly cacheInvalidation: CacheInvalidationService) {}

  @OnEvent(ResumeUpdatedEvent.TYPE)
  async handle(event: ResumeUpdatedEvent): Promise<void> {
    this.logger.log(`Invalidating cache for resume: ${event.aggregateId}`);

    await this.cacheInvalidation.invalidateResume({
      resumeId: event.aggregateId,
      userId: event.payload.userId,
    });
  }
}
