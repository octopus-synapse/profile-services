/**
 * Bundle token for the automation BC. Doubles as the TypeScript shape
 * and the Nest DI token. Composition lives in `automation.composition.ts`
 * — Nest-free.
 */

import type { ApproveCuratedItemUseCase } from '../use-cases/approve-curated-item/approve-curated-item.use-case';
import type { GetCurrentBatchUseCase } from '../use-cases/get-current-batch/get-current-batch.use-case';
import type { RejectCuratedItemUseCase } from '../use-cases/reject-curated-item/reject-curated-item.use-case';
import type { RunRageApplyUseCase } from '../use-cases/run-rage-apply/run-rage-apply.use-case';

export abstract class AutomationUseCases {
  abstract readonly getCurrentBatch: GetCurrentBatchUseCase;
  abstract readonly approveCuratedItem: ApproveCuratedItemUseCase;
  abstract readonly rejectCuratedItem: RejectCuratedItemUseCase;
  abstract readonly runRageApply: RunRageApplyUseCase;
}
