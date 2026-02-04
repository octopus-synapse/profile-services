import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ResumePublishedEvent } from '@/bounded-contexts/presentation';
import { ActivityService } from '../../social/services/activity.service';

@Injectable()
export class ResumePublishedActivityHandler {
  constructor(private readonly activityService: ActivityService) {}

  @OnEvent(ResumePublishedEvent.TYPE)
  async handle(event: ResumePublishedEvent): Promise<void> {
    await this.activityService.createActivity(
      event.payload.userId,
      'RESUME_PUBLISHED',
      { slug: event.payload.slug },
      event.aggregateId,
      'resume',
    );
  }
}
