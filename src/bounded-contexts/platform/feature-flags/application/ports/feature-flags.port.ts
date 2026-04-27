/**
 * Bundle token for the feature-flags BC. Doubles as the TypeScript
 * shape of the use-case bag and the Nest DI token. Wiring lives in
 * `feature-flags.module.ts` via a useFactory that pulls the existing
 * @Injectable use-case providers.
 */

import type { BroadcastRefreshUseCase } from '../use-cases/broadcast-refresh.use-case';
import type { ImpactAnalysisUseCase } from '../use-cases/impact-analysis.use-case';
import type { ListFlagsUseCase } from '../use-cases/list-flags.use-case';
import type { ToggleFlagUseCase } from '../use-cases/toggle-flag.use-case';
import type { FeatureFlagService } from '../services/feature-flag.service';

export abstract class FeatureFlagsUseCases {
  abstract readonly listFlags: ListFlagsUseCase;
  abstract readonly toggleFlag: ToggleFlagUseCase;
  abstract readonly impactAnalysis: ImpactAnalysisUseCase;
  abstract readonly broadcastRefresh: BroadcastRefreshUseCase;
  abstract readonly featureFlagService: FeatureFlagService;
}
