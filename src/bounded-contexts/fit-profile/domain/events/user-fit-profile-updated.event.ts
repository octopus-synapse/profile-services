import { DomainEvent } from '@/shared-kernel';

export interface UserFitProfileUpdatedPayload {
  /** Current vector version after the write. Downstream consumers can
   * ignore stale-by-race events by checking this number against their
   * cache key. */
  readonly version: number;
  /** True when this update was triggered by the scheduled expiry
   * worker rather than a fresh questionnaire submission. Cache
   * invalidation behaviour is the same in both cases; notifications
   * only fire on `cause: 'expired'`. */
  readonly cause: 'remap' | 'expired';
}

/**
 * Emitted when a user's fit vector mutates — either because they
 * committed new questionnaire answers (`cause: 'remap'`) or because
 * the nightly expiry worker flipped their profile into the expired
 * state (`cause: 'expired'`). The `aggregateId` is the userId.
 *
 * Consumers today:
 * - `job-match` → wipe cached Match Scores for this user.
 * - `notifications` (future) → send "refaça o questionário" email on
 *   `cause: 'expired'` and "obrigado, scores atualizados" on 'remap'.
 */
export class UserFitProfileUpdatedEvent extends DomainEvent<UserFitProfileUpdatedPayload> {
  static readonly TYPE = 'fit-profile.user-updated';
  constructor(userId: string, payload: UserFitProfileUpdatedPayload) {
    super(UserFitProfileUpdatedEvent.TYPE, userId, payload);
  }
}
