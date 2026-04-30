/**
 * Pure-TS wiring for the resumes/time-capsule BC. Zero `@nestjs/*`
 * imports — the Nest module is a thin shell that exposes the result of
 * this function through `useFactory` providers.
 *
 * The BC has no HTTP routes — its only job is the daily anniversary
 * cron tick. The composition therefore exposes:
 *  - `useCases`: the `TimeCapsuleService` aggregate (re-used as the
 *    bundle since the BC has no per-use-case ports yet),
 *  - `routes`: empty array,
 *  - `lifecycles`: a single init() that registers the worker against
 *    the shared `CronPort`.
 */

import type { EmailService } from '@/bounded-contexts/platform/common/email/email.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import type { CronPort } from '@/shared-kernel/jobs/cron.port';
import type { Lifecycle } from '@/shared-kernel/lifecycle/lifecycle.port';
import { TimeCapsuleService } from './time-capsule.service';
import { TimeCapsuleWorker } from './time-capsule.worker';

export { TimeCapsuleService };

export type TimeCapsuleUseCases = {
  readonly timeCapsule: TimeCapsuleService;
};

export function buildTimeCapsuleUseCases(
  prisma: PrismaService,
  email: EmailService,
  logger: LoggerPort,
): TimeCapsuleUseCases {
  return {
    timeCapsule: new TimeCapsuleService(prisma, email, logger),
  };
}

/**
 * Build the framework-free composition for the time-capsule BC.
 *
 * The bootstrap is responsible for:
 *  - awaiting `lifecycles[i].init()` in declaration order at boot
 *    (registers the daily 08:30 UTC cron tick).
 */
export function buildTimeCapsuleComposition(
  prisma: PrismaService,
  email: EmailService,
  logger: LoggerPort,
  cron: CronPort,
): BoundedContextComposition<TimeCapsuleUseCases> {
  const useCases = buildTimeCapsuleUseCases(prisma, email, logger);
  const worker = new TimeCapsuleWorker(useCases.timeCapsule, logger);

  const lifecycles: ReadonlyArray<Lifecycle> = [
    {
      init: async (): Promise<void> => {
        // Daily 08:30 UTC — early enough to land in the morning inbox.
        cron.register({ pattern: '30 8 * * *' }, worker.run.bind(worker));
      },
    },
  ];

  return {
    useCases,
    routes: [],
    lifecycles,
  };
}
