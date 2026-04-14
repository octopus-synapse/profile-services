import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SectionUpdatedEvent } from '@/bounded-contexts/resumes';
import {
  ANALYTICS_PROJECTION_PORT,
  AnalyticsProjectionPort,
} from '../ports/analytics-projection.port';

@Injectable()
export class SyncProjectionOnSectionUpdatedHandler {
  private readonly logger = new Logger(SyncProjectionOnSectionUpdatedHandler.name);

  constructor(
    @Inject(ANALYTICS_PROJECTION_PORT)
    private readonly projection: AnalyticsProjectionPort,
  ) {}

  @OnEvent(SectionUpdatedEvent.TYPE)
  async handle(event: SectionUpdatedEvent): Promise<void> {
    const resumeId = event.aggregateId;
    const sectionIdentity =
      event.payload.sectionTypeKey ?? event.payload.sectionKind ?? event.payload.sectionType;

    this.logger.debug(`Section ${sectionIdentity ?? 'unknown'} updated for resume: ${resumeId}`);

    await this.projection.touchProjection(resumeId);
  }
}
