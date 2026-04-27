/**
 * Bundle token for the badges BC. Doubles as the TypeScript shape of
 * the use-case bag and the Nest DI token. Composition lives in
 * `badges.composition.ts` — Nest-free.
 */

import type { AwardBadgeUseCase } from '../use-cases/award-badge/award-badge.use-case';
import type { HandleAtsScoreCalculatedUseCase } from '../use-cases/handle-ats-score-calculated/handle-ats-score-calculated.use-case';
import type { HandleInterviewScheduledUseCase } from '../use-cases/handle-interview-scheduled/handle-interview-scheduled.use-case';
import type { HandlePostCreatedUseCase } from '../use-cases/handle-post-created/handle-post-created.use-case';
import type { ListManyUsersBadgesUseCase } from '../use-cases/list-many-users-badges/list-many-users-badges.use-case';
import type { ListUserBadgesUseCase } from '../use-cases/list-user-badges/list-user-badges.use-case';

export abstract class BadgesUseCases {
  abstract readonly listUserBadges: ListUserBadgesUseCase;
  abstract readonly listManyUsersBadges: ListManyUsersBadgesUseCase;
  abstract readonly awardBadge: AwardBadgeUseCase;
  abstract readonly handlePostCreated: HandlePostCreatedUseCase;
  abstract readonly handleAtsScoreCalculated: HandleAtsScoreCalculatedUseCase;
  abstract readonly handleInterviewScheduled: HandleInterviewScheduledUseCase;
}
