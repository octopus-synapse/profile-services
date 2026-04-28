/**
 * Explicit registration of resume-quality-BC event handlers.
 *
 * The handler is a framework-free POJO; this file wires it to the
 * `EventBusPort` via `bus.on(EventClass.TYPE, ...)`.
 */

import { ResumeUpdatedEvent } from '@/bounded-contexts/resumes';
import type { EventBusPort, LoggerPort } from '@/shared-kernel';
import type { JobQueuePort } from '@/shared-kernel/jobs/job-queue.port';
import { ResumeQualityOnResumeUpdatedHandler } from './resume-quality-on-resume-updated.handler';

export interface ResumeQualityHandlersDeps {
  readonly eventBus: EventBusPort;
  readonly queue: JobQueuePort;
  readonly logger: LoggerPort;
}

export function registerResumeQualityHandlers(deps: ResumeQualityHandlersDeps): void {
  const { eventBus, queue, logger } = deps;

  const handler = new ResumeQualityOnResumeUpdatedHandler(queue, logger);
  eventBus.on(ResumeUpdatedEvent.TYPE, handler.onResumeUpdated.bind(handler));
}
