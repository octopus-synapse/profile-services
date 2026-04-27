import { ResumeUpdatedEvent } from '@/bounded-contexts/resumes';
import { LoggerPort } from '@/shared-kernel';

export abstract class ViewTracker {
  abstract trackResumeUpdate(resumeId: string, fields: readonly string[]): Promise<void>;
}

export class ResumeUpdatedHandler {
  constructor(
    private readonly tracker: ViewTracker,
    private readonly logger: LoggerPort,
  ) {}

  async handle(event: ResumeUpdatedEvent): Promise<void> {
    await this.tracker.trackResumeUpdate(event.aggregateId, event.payload.changedFields);
  }
}
