import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ResumeUpdatedEvent } from '@/bounded-contexts/resumes';

export const VIEW_TRACKER = Symbol('VIEW_TRACKER');

export interface ViewTracker {
  trackResumeUpdate(resumeId: string, fields: readonly string[]): Promise<void>;
}

@Injectable()
export class ResumeUpdatedHandler {
  constructor(@Inject(VIEW_TRACKER) private readonly tracker: ViewTracker) {}

  @OnEvent(ResumeUpdatedEvent.TYPE)
  async handle(event: ResumeUpdatedEvent): Promise<void> {
    await this.tracker.trackResumeUpdate(event.aggregateId, event.payload.changedFields);
  }
}
