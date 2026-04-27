/**
 * Pure-TS wiring for the automation BC. Zero `@nestjs/*` imports.
 *
 * Composes both slices (apply-mode + rage-apply) into one bundle. The
 * `CuratedSelectorService` POJO is shared between the rage-apply use
 * case and the two BullMQ workers (`AutoApplyWorker`, `WeeklyCuratedWorker`),
 * so the module owns its singleton lifecycle and hands it in here. Same
 * deal with `ResumeTailorService` — a Nest-decorated service from the
 * resume-versions BC that the workers also consume directly.
 */

import type { ResumeTailorService } from '@/bounded-contexts/resumes/resume-versions/application/services/resume-tailor.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import { AutomationUseCases } from './application/ports/automation.port';
import { CuratedSelectorService } from './application/services/curated-selector.service';
import { ApproveCuratedItemUseCase } from './application/use-cases/approve-curated-item/approve-curated-item.use-case';
import { GetCurrentBatchUseCase } from './application/use-cases/get-current-batch/get-current-batch.use-case';
import { RejectCuratedItemUseCase } from './application/use-cases/reject-curated-item/reject-curated-item.use-case';
import { RunRageApplyUseCase } from './application/use-cases/run-rage-apply/run-rage-apply.use-case';
import { PrismaApplyModeRepository } from './infrastructure/adapters/persistence/prisma-apply-mode.repository';
import { PrismaRageApplyRepository } from './infrastructure/adapters/persistence/prisma-rage-apply.repository';

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

  return {
    getCurrentBatch: new GetCurrentBatchUseCase(applyModeRepo),
    approveCuratedItem: new ApproveCuratedItemUseCase(applyModeRepo, logger),
    rejectCuratedItem: new RejectCuratedItemUseCase(applyModeRepo, logger),
    runRageApply: new RunRageApplyUseCase(rageApplyRepo, selector, tailor, logger),
  };
}
