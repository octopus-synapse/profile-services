/**
 * Explicit registration of job-match-BC event handlers.
 *
 * The handler is a framework-free POJO; this file wires it to the
 * `EventBusPort` via `bus.on(EventClass.TYPE, ...)`.
 */

import { ResumeUpdatedEvent } from '@/bounded-contexts/resumes';
import type { EventBusPort } from '@/shared-kernel';
import type { JobQueuePort } from '@/shared-kernel/jobs/job-queue.port';
import { JobMatchRecomputeOnResumeUpdatedHandler } from './job-match-recompute-on-resume-updated.handler';

export interface JobMatchHandlersDeps {
  readonly eventBus: EventBusPort;
  readonly queue: JobQueuePort;
}

export function registerJobMatchHandlers(deps: JobMatchHandlersDeps): void {
  const { eventBus, queue } = deps;

  const handler = new JobMatchRecomputeOnResumeUpdatedHandler(queue);
  eventBus.on(ResumeUpdatedEvent.TYPE, handler.onResumeUpdated.bind(handler));
}
