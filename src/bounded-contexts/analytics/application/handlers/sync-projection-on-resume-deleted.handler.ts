import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ResumeDeletedEvent } from '@/bounded-contexts/resumes';
import {
  ANALYTICS_PROJECTION_PORT,
  AnalyticsProjectionPort,
} from '../ports/analytics-projection.port';

@Injectable()
export class SyncProjectionOnResumeDeletedHandler {
  private readonly logger = new Logger(SyncProjectionOnResumeDeletedHandler.name);

  constructor(
    @Inject(ANALYTICS_PROJECTION_PORT)
    private readonly projection: AnalyticsProjectionPort,
  ) {}

  @OnEvent(ResumeDeletedEvent.TYPE)
  async handle(event: ResumeDeletedEvent): Promise<void> {
    const resumeId = event.aggregateId;

    this.logger.log(`Deleting analytics projection for resume: ${resumeId}`);

    await this.projection.deleteProjection(resumeId);

    this.logger.log(`Analytics projection deleted for resume: ${resumeId}`);
  }
}
