import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SectionAddedEvent } from '@/bounded-contexts/resumes';
import { AnalyticsProjectionPort } from '../ports/analytics-projection.port';

@Injectable()
export class SyncProjectionOnSectionAddedHandler {
  private readonly logger = new Logger(SyncProjectionOnSectionAddedHandler.name);

  constructor(private readonly projection: AnalyticsProjectionPort) {}

  @OnEvent(SectionAddedEvent.TYPE)
  async handle(event: SectionAddedEvent): Promise<void> {
    const resumeId = event.aggregateId;
    const semanticKind = event.payload.sectionKind;

    if (!semanticKind) {
      this.logger.warn(`No semanticKind in event for resume: ${resumeId}`);
      return;
    }

    this.logger.debug(`Incrementing ${semanticKind} count for resume: ${resumeId}`);

    await this.projection.incrementSectionCount(resumeId, semanticKind);
  }
}
