import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SectionAddedEvent } from '@/bounded-contexts/resumes';
import { LoggerPort } from '@/shared-kernel';
import { AnalyticsProjectionPort } from '../ports/analytics-projection.port';

const CTX = 'SyncProjectionOnSectionAddedHandler';

@Injectable()
export class SyncProjectionOnSectionAddedHandler {
  constructor(
    private readonly projection: AnalyticsProjectionPort,
    private readonly logger: LoggerPort,
  ) {}

  @OnEvent(SectionAddedEvent.TYPE)
  async handle(event: SectionAddedEvent): Promise<void> {
    const resumeId = event.aggregateId;
    const semanticKind = event.payload.sectionKind;

    if (!semanticKind) {
      this.logger.warn(`No semanticKind in event for resume: ${resumeId}`, CTX);
      return;
    }

    this.logger.debug(`Incrementing ${semanticKind} count for resume: ${resumeId}`, CTX);

    await this.projection.incrementSectionCount(resumeId, semanticKind);
  }
}
