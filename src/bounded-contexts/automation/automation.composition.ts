/**
 * Pure-TS wiring for the automation BC. Zero `@nestjs/*` imports — Phase 1
 * canonical shape: `buildAutomationComposition(...deps)` returns
 * `{ useCases, routes }` as a `BoundedContextComposition`.
 *
 * Composes both slices (apply-mode + rage-apply) into one bundle. The
 * `CuratedSelectorService` POJO is shared between the rage-apply use
 * case and the two BullMQ workers (`AutoApplyWorker`, `WeeklyCuratedWorker`),
 * so the bootstrap owns its singleton lifecycle and hands it in here. Same
 * deal with `ResumeTailorService` — a service from the resume-versions BC
 * that the workers also consume directly.
 *
 * `registerAutomationJobs` stays a separate export: the Elysia bootstrap
 * invokes it once it has built the shared `JobQueuePort` adapter, so the
 * BC never references BullMQ or the queue adapter directly.
 */

import type { EmailService } from '@/bounded-contexts/platform/common/email/email.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { ResumeTailorService } from '@/bounded-contexts/resumes/resume-versions/application/services/resume-tailor.service';
import type { LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import type { JobQueuePort } from '@/shared-kernel/jobs/job-queue.port';
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

export function buildAutomationComposition(
  prisma: PrismaService,
  logger: LoggerPort,
  selector: CuratedSelectorService,
  tailor: ResumeTailorService,
): BoundedContextComposition<AutomationUseCases> {
  const useCases = buildAutomationUseCases(prisma, logger, selector, tailor);

  return {
    useCases,
    routes: automationRoutes,
  };
}

/**
 * Registers the automation BC's BullMQ workers + their cron-driven
 * `schedule` ticks against the shared `JobQueuePort`. Called once at
 * app boot from the Elysia bootstrap.
 *
 * Schedules:
 *  - Auto-apply: hourly at minute 15 (`15 * * * *`, America/Sao_Paulo) —
 *    staggered away from the weekly-curated tick so the two workers
 *    don't fight for DB connections.
 *  - Weekly-curated: Monday 09:00 America/Sao_Paulo (`0 9 * * 1`).
 */
export function registerAutomationJobs(
  queue: JobQueuePort,
  prisma: PrismaService,
  selector: CuratedSelectorService,
  tailor: ResumeTailorService,
  email: EmailService,
  logger: LoggerPort,
): void {
  const autoApply = new AutoApplyWorker(prisma, selector, tailor, queue, logger);
  queue.register<AutoApplyJobData>(AUTO_APPLY_QUEUE, autoApply.process.bind(autoApply));
  void queue.schedule<AutoApplyJobData>(
    AUTO_APPLY_QUEUE,
    { kind: 'schedule' },
    {
      repeat: { pattern: '15 * * * *', tz: 'America/Sao_Paulo' },
      jobId: 'auto-apply-schedule-cron',
    },
  );

  const weeklyCurated = new WeeklyCuratedWorker(prisma, selector, email, queue, logger);
  queue.register<WeeklyCuratedJobData>(
    WEEKLY_CURATED_QUEUE,
    weeklyCurated.process.bind(weeklyCurated),
  );
  void queue.schedule<WeeklyCuratedJobData>(
    WEEKLY_CURATED_QUEUE,
    { kind: 'schedule' },
    {
      repeat: { pattern: '0 9 * * 1', tz: 'America/Sao_Paulo' },
      jobId: 'weekly-curated-schedule-cron',
    },
  );
}
