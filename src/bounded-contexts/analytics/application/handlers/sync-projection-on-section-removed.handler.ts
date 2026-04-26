import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SectionRemovedEvent } from '@/bounded-contexts/resumes';
import { LoggerPort } from '@/shared-kernel';
import { AnalyticsProjectionPort } from '../ports/analytics-projection.port';

const CTX = 'SyncProjectionOnSectionRemovedHandler';

@Injectable()
export class SyncProjectionOnSectionRemovedHandler {
  constructor(
    private readonly projection: AnalyticsProjectionPort,
    private readonly logger: LoggerPort,
  ) {}

  @OnEvent(SectionRemovedEvent.TYPE)
  async handle(event: SectionRemovedEvent): Promise<void> {
    const resumeId = event.aggregateId;
    const semanticKind = event.payload.sectionKind;

    if (!semanticKind) {
      this.logger.warn(`No semanticKind in event for resume: ${resumeId}`, CTX);
      return;
    }

    this.logger.debug(`Decrementing ${semanticKind} count for resume: ${resumeId}`, CTX);

    await this.projection.decrementSectionCount(resumeId, semanticKind);
  }
}
