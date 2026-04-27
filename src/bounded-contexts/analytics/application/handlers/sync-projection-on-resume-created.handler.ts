import { ResumeCreatedEvent } from '@/bounded-contexts/resumes';
import { LoggerPort } from '@/shared-kernel';
import { AnalyticsProjectionPort } from '../ports/analytics-projection.port';

const CTX = 'SyncProjectionOnResumeCreatedHandler';

export class SyncProjectionOnResumeCreatedHandler {
  constructor(
    private readonly projection: AnalyticsProjectionPort,
    private readonly logger: LoggerPort,
  ) {}

  async handle(event: ResumeCreatedEvent): Promise<void> {
    const resumeId = event.aggregateId;
    const { userId, title } = event.payload;

    this.logger.log(`Creating analytics projection for resume: ${resumeId}`, CTX);

    await this.projection.upsertProjection(resumeId, { userId, title });

    this.logger.log(`Analytics projection created for resume: ${resumeId}`, CTX);
  }
}
