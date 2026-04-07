import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import type { UserProfile, UserProfileRepositoryPort } from '../../ports/user-profile.port';

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

    return profile;
  }
}
