import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import { USERNAME_UPDATE_COOLDOWN_DAYS } from '../../../domain/value-objects/username-rules.const';
import type { UserProfile } from '../../ports/user-profile.port';
import { UserProfileRepositoryPort } from '../../ports/user-profile.port';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Get Profile Use Case
 *
 * Single Responsibility: Retrieve the authenticated user's profile.
 * Returns domain entity (UserProfile), not envelope.
 */
export class GetProfileUseCase {
  constructor(private readonly repository: UserProfileRepositoryPort) {}

  async execute(userId: string): Promise<UserProfile> {
    const profile = await this.repository.findUserProfileById(userId);

    if (!profile) {
      throw new EntityNotFoundException('User');
    }

    return {
      ...profile,
      usernameChangeAvailableAt: this.computeUsernameChangeAvailableAt(profile.usernameUpdatedAt),
    };
  }

  /**
   * The next moment the user may change their username, or `null` when they
   * can already do so (never changed, or the cooldown has elapsed). Computed
   * here — not on the client — so "30 days" lives in exactly one place.
   */
  private computeUsernameChangeAvailableAt(usernameUpdatedAt?: Date | null): Date | null {
    if (!usernameUpdatedAt) return null;
    const unlockAt = new Date(
      usernameUpdatedAt.getTime() + USERNAME_UPDATE_COOLDOWN_DAYS * MS_PER_DAY,
    );
    return unlockAt.getTime() > Date.now() ? unlockAt : null;
  }
}
