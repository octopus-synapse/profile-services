import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SectionRemovedEvent } from '@/bounded-contexts/resumes';
import {
  ANALYTICS_PROJECTION_PORT,
  AnalyticsProjectionPort,
} from '../ports/analytics-projection.port';

@Injectable()
export class SyncProjectionOnSectionRemovedHandler {
  private readonly logger = new Logger(SyncProjectionOnSectionRemovedHandler.name);

  constructor(
    @Inject(ANALYTICS_PROJECTION_PORT)
    private readonly projection: AnalyticsProjectionPort,
  ) {}

  @OnEvent(SectionRemovedEvent.TYPE)
  async handle(event: SectionRemovedEvent): Promise<void> {
    const resumeId = event.aggregateId;
    const semanticKind = event.payload.sectionKind;

    if (!semanticKind) {
      this.logger.warn(`No semanticKind in event for resume: ${resumeId}`);
      return;
    }

    this.logger.debug(`Decrementing ${semanticKind} count for resume: ${resumeId}`);

    await this.projection.decrementSectionCount(resumeId, semanticKind);
  }
}
