import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ResumeCreatedEvent } from '@/bounded-contexts/resumes';
import {
  ANALYTICS_PROJECTION_PORT,
  AnalyticsProjectionPort,
} from '../ports/analytics-projection.port';

@Injectable()
export class SyncProjectionOnResumeCreatedHandler {
  private readonly logger = new Logger(SyncProjectionOnResumeCreatedHandler.name);

  constructor(
    @Inject(ANALYTICS_PROJECTION_PORT)
    private readonly projection: AnalyticsProjectionPort,
  ) {}

  @OnEvent(ResumeCreatedEvent.TYPE)
  async handle(event: ResumeCreatedEvent): Promise<void> {
    const resumeId = event.aggregateId;
    const { userId, title } = event.payload;

    this.logger.log(`Creating analytics projection for resume: ${resumeId}`);

    await this.projection.upsertProjection(resumeId, { userId, title });

    this.logger.log(`Analytics projection created for resume: ${resumeId}`);
  }
}
