import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ResumeCreatedEvent } from '@/bounded-contexts/resumes';
import { ActivityService } from '../../social/services/activity.service';

@Injectable()
export class ResumeCreatedActivityHandler {
  constructor(private readonly activityService: ActivityService) {}

  @OnEvent(ResumeCreatedEvent.TYPE)
  async handle(event: ResumeCreatedEvent): Promise<void> {
    await this.activityService.createActivity(
      event.payload.userId,
      'RESUME_CREATED',
      { resumeTitle: event.payload.title },
      event.aggregateId,
      'resume',
    );
  }
}
