import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ResumeDeletedEvent } from '@/bounded-contexts/resumes';
import { LoggerPort } from '@/shared-kernel';
import { AnalyticsProjectionPort } from '../ports/analytics-projection.port';

const CTX = 'SyncProjectionOnResumeDeletedHandler';

@Injectable()
export class SyncProjectionOnResumeDeletedHandler {
  constructor(
    private readonly projection: AnalyticsProjectionPort,
    private readonly logger: LoggerPort,
  ) {}

  @OnEvent(ResumeDeletedEvent.TYPE)
  async handle(event: ResumeDeletedEvent): Promise<void> {
    const resumeId = event.aggregateId;

    this.logger.log(`Deleting analytics projection for resume: ${resumeId}`, CTX);

    await this.projection.deleteProjection(resumeId);

    this.logger.log(`Analytics projection deleted for resume: ${resumeId}`, CTX);
  }
}
