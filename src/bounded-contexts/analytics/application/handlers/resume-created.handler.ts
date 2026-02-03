import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ResumeCreatedEvent } from '@/bounded-contexts/resumes';

export const ANALYTICS_RECORDER = Symbol('ANALYTICS_RECORDER');

export interface AnalyticsRecorder {
  recordResumeCreation(resumeId: string, userId: string): Promise<void>;
}

@Injectable()
export class ResumeCreatedHandler {
  constructor(
    @Inject(ANALYTICS_RECORDER) private readonly recorder: AnalyticsRecorder,
  ) {}

  @OnEvent(ResumeCreatedEvent.TYPE)
  async handle(event: ResumeCreatedEvent): Promise<void> {
    await this.recorder.recordResumeCreation(
      event.aggregateId,
      event.payload.userId,
    );
  }
}
