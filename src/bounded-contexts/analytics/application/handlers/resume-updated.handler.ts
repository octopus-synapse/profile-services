import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ResumeUpdatedEvent } from '@/bounded-contexts/resumes';
import { LoggerPort } from '@/shared-kernel';

export abstract class ViewTracker {
  abstract trackResumeUpdate(resumeId: string, fields: readonly string[]): Promise<void>;
}

@Injectable()
export class ResumeUpdatedHandler {
  constructor(
    private readonly tracker: ViewTracker,
    private readonly logger: LoggerPort,
  ) {}

  @OnEvent(ResumeUpdatedEvent.TYPE)
  async handle(event: ResumeUpdatedEvent): Promise<void> {
    await this.tracker.trackResumeUpdate(event.aggregateId, event.payload.changedFields);
  }
}
