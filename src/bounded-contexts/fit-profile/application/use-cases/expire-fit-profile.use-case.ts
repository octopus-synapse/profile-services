import { Injectable, Logger } from '@nestjs/common';
import { EventPublisher } from '@/shared-kernel';
import { UserFitProfileUpdatedEvent } from '../../domain/events';
import {
  type SavedUserFitProfile,
  UserFitProfileRepositoryPort,
} from '../../domain/ports/user-fit-profile.repository.port';

/**
 * Exposed for Task #20 to wrap in a BullMQ worker. "Expiring" a fit
 * profile is a state-only operation today: we do not delete the vector
 * (the user can still re-commit fresh answers to supersede it), we
 * just rely on the existing `expiresAt` column — which is what the
 * `GetFitProfileStatusUseCase` already reads. The use-case is
 * nevertheless useful as a domain-level trigger for emitting the
 * `UserFitProfileUpdatedEvent` (with `cause: 'expired'`) when the
 * worker fires — Match cache invalidation + future notifications
 * subscribe to that event.
 *
 * Keep this idempotent: calling it twice for the same expired profile
 * is allowed and returns the same shape.
 */
@Injectable()
export class ExpireFitProfileUseCase {
  private readonly logger = new Logger(ExpireFitProfileUseCase.name);

  constructor(
    private readonly profiles: UserFitProfileRepositoryPort,
    private readonly events: EventPublisher,
  ) {}

  async execute(
    userId: string,
    now: Date = new Date(),
  ): Promise<{ expired: boolean; profile: SavedUserFitProfile | null }> {
    const profile = await this.profiles.findByUserId(userId);
    if (!profile || profile.vector === null) return { expired: false, profile };

    const isExpired = profile.expiresAt.getTime() <= now.getTime();
    if (isExpired) {
      this.logger.log(`UserFitProfile expired for user ${userId}`);
      this.events.publish(
        new UserFitProfileUpdatedEvent(userId, { version: profile.version, cause: 'expired' }),
      );
    }
    return { expired: isExpired, profile };
  }
}
