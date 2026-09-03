/**
 * Pure-TS wiring for the automation BC. Zero `@nestjs/*` imports — Phase 1
 * canonical shape: `buildAutomationComposition(...deps)` returns
 * `{ useCases, routes, workers, lifecycles }` as a `BoundedContextComposition`.
 *
 * Composes both slices (apply-mode + rage-apply) into one bundle. The
 * `CuratedSelectorService` POJO is shared between the rage-apply use
 * case and the two BullMQ workers (`AutoApplyWorker`, `WeeklyCuratedWorker`),
 * so the bootstrap owns its singleton lifecycle and hands it in here. Same
 * deal with `ResumeTailorService` — a service from the resume-versions BC
 * that the workers also consume directly.
 *
 * Both workers are gated by `automation.enabled` (`enabledWhen`): with the
 * flag off the bootstrap registers them inert, so no tick can ever apply to a
 * job on a user's behalf without an explicit admin opt-in.
 */

import type { EmailService } from '@/bounded-contexts/platform/common/email/email.service';
import { AUTOMATION_ENABLED_FLAG_KEY } from '@/bounded-contexts/platform/feature-flags/registry/groups/automation.flags';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { ResumeTailorService } from '@/bounded-contexts/resumes/resume-versions/application/services/resume-tailor.service';
import type { LoggerPort } from '@/shared-kernel';
import type { BcWorkerBinding, BoundedContextComposition } from '@/shared-kernel/composition';
import type { JobQueuePort } from '@/shared-kernel/jobs/job-queue.port';
import type { Lifecycle } from '@/shared-kernel/lifecycle/lifecycle.port';
import { AutomationUseCases } from './application/ports/automation.port';
import { CuratedSelectorService } from './application/services/curated-selector.service';
import { ApproveCuratedItemUseCase } from './application/use-cases/approve-curated-item/approve-curated-item.use-case';
import { GetCurrentBatchUseCase } from './application/use-cases/get-current-batch/get-current-batch.use-case';
import { RejectCuratedItemUseCase } from './application/use-cases/reject-curated-item/reject-curated-item.use-case';
import { RunRageApplyUseCase } from './application/use-cases/run-rage-apply/run-rage-apply.use-case';
import { automationRoutes } from './automation.routes';
// P1-046 — wrap the cross-BC `ResumeTailorService` in an adapter
// owned by automation so the use case depends on the typed port,
// not the resumes BC's class directly. The composition still takes
// the live service from the bootstrap so behaviour is identical.
import { ResumeTailorAdapter } from './infrastructure/adapters/external-services/resume-tailor.adapter';
import { PrismaApplyModeRepository } from './infrastructure/adapters/persistence/prisma-apply-mode.repository';
import { PrismaRageApplyRepository } from './infrastructure/adapters/persistence/prisma-rage-apply.repository';
import {
  AUTO_APPLY_QUEUE,
  type AutoApplyJobData,
  AutoApplyWorker,
} from './workers/auto-apply.worker';
import {
  WEEKLY_CURATED_QUEUE,
  type WeeklyCuratedJobData,
  WeeklyCuratedWorker,
} from './workers/weekly-curated.worker';

export { AutomationUseCases };

export function buildAutomationUseCases(
  prisma: PrismaService,
  logger: LoggerPort,
  selector: CuratedSelectorService,
  tailor: ResumeTailorService,
): AutomationUseCases {
  // Repos
  const applyModeRepo = new PrismaApplyModeRepository(prisma, logger);
  const rageApplyRepo = new PrismaRageApplyRepository(prisma, logger);
  // P1-046 — adapt the cross-BC service to automation's local port.
  const tailorPort = new ResumeTailorAdapter(tailor);

  return {
    getCurrentBatch: new GetCurrentBatchUseCase(applyModeRepo),
    approveCuratedItem: new ApproveCuratedItemUseCase(applyModeRepo, logger),
    rejectCuratedItem: new RejectCuratedItemUseCase(applyModeRepo, logger),
    runRageApply: new RunRageApplyUseCase(rageApplyRepo, selector, tailorPort, logger),
  };
}

/**
 * Build the framework-free composition for the automation BC.
 *
 * The bootstrap is responsible for:
 *  - mounting `routes` against `useCases`,
 *  - calling `queue.register(b.queue, b.process)` for each `workers`
 *    entry (honouring `enabledWhen`),
 *  - awaiting `lifecycles[i].init()` at boot (the `queue.schedule` ticks).
 *
 * Schedules:
 *  - Auto-apply: hourly at minute 15 (`15 * * * *`, America/Sao_Paulo) —
 *    staggered away from the weekly-curated tick so the two workers
 *    don't fight for DB connections.
 *  - Weekly-curated: Monday 09:00 America/Sao_Paulo (`0 9 * * 1`).
 *
 * The ticks are scheduled regardless of the flag: a repeat job with no
 * consumer parks a single delayed job in Redis, and it is picked up on the
 * first boot where `automation.enabled` is on — no re-scheduling needed.
 */
export function buildAutomationComposition(
  prisma: PrismaService,
  logger: LoggerPort,
  selector: CuratedSelectorService,
  tailor: ResumeTailorService,
  email: EmailService,
  queue: JobQueuePort,
): BoundedContextComposition<AutomationUseCases> {
  const useCases = buildAutomationUseCases(prisma, logger, selector, tailor);

  const autoApply = new AutoApplyWorker(prisma, selector, tailor, queue, logger);
  const weeklyCurated = new WeeklyCuratedWorker(prisma, selector, email, queue, logger);

  const workers: ReadonlyArray<BcWorkerBinding> = [
    {
      queue: AUTO_APPLY_QUEUE,
      process: autoApply.process.bind(autoApply) as BcWorkerBinding['process'],
      enabledWhen: AUTOMATION_ENABLED_FLAG_KEY,
    },
    {
      queue: WEEKLY_CURATED_QUEUE,
      process: weeklyCurated.process.bind(weeklyCurated) as BcWorkerBinding['process'],
      enabledWhen: AUTOMATION_ENABLED_FLAG_KEY,
    },
  ];

  const lifecycles: ReadonlyArray<Lifecycle> = [
    {
      init: async (): Promise<void> => {
        await queue.schedule<AutoApplyJobData>(
          AUTO_APPLY_QUEUE,
          { kind: 'schedule' },
          {
            repeat: { pattern: '15 * * * *', tz: 'America/Sao_Paulo' },
            jobId: 'auto-apply-schedule-cron',
          },
        );
        await queue.schedule<WeeklyCuratedJobData>(
          WEEKLY_CURATED_QUEUE,
          { kind: 'schedule' },
          {
            repeat: { pattern: '0 9 * * 1', tz: 'America/Sao_Paulo' },
            jobId: 'weekly-curated-schedule-cron',
          },
        );
      },
    },
  ];

  return {
    useCases,
    routes: automationRoutes,
    workers,
    lifecycles,
  };
}
