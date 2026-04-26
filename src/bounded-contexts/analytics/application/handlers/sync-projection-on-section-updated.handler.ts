import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SectionUpdatedEvent } from '@/bounded-contexts/resumes';
import { LoggerPort } from '@/shared-kernel';
import { AnalyticsProjectionPort } from '../ports/analytics-projection.port';

const CTX = 'SyncProjectionOnSectionUpdatedHandler';

@Injectable()
export class SyncProjectionOnSectionUpdatedHandler {
  constructor(
    private readonly projection: AnalyticsProjectionPort,
    private readonly logger: LoggerPort,
  ) {}

  @OnEvent(SectionUpdatedEvent.TYPE)
  async handle(event: SectionUpdatedEvent): Promise<void> {
    const resumeId = event.aggregateId;
    const sectionIdentity =
      event.payload.sectionTypeKey ?? event.payload.sectionKind ?? event.payload.sectionType;

    this.logger.debug(
      `Section ${sectionIdentity ?? 'unknown'} updated for resume: ${resumeId}`,
      CTX,
    );

    await this.projection.touchProjection(resumeId);
  }
}
