import { ResumePublishedEvent } from '@/bounded-contexts/presentation';
import { LoggerPort } from '@/shared-kernel';
import { ActivityService } from '../../services/activity.service';

export class ResumePublishedActivityHandler {
  constructor(
    private readonly activityService: ActivityService,
    private readonly logger: LoggerPort,
  ) {}

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
