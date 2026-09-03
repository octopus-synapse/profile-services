/**
 * Bundle token for the admin-collaboration BC. Doubles as the TypeScript
 * shape and the Nest DI token. Composition lives in
 * `admin-collaboration.composition.ts` — Nest-free.
 */

import type { GetCollaborationStatsUseCase } from '../use-cases/get-collaboration-stats/get-collaboration-stats.use-case';
import type { ListCollaborationsUseCase } from '../use-cases/list-collaborations/list-collaborations.use-case';
import type { RemoveCollaborationUseCase } from '../use-cases/remove-collaboration/remove-collaboration.use-case';

export abstract class AdminCollaborationUseCases {
  abstract readonly getCollaborationStats: GetCollaborationStatsUseCase;
  abstract readonly listCollaborations: ListCollaborationsUseCase;
  abstract readonly removeCollaboration: RemoveCollaborationUseCase;
}
