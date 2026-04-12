import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import type {
  UpdateProfileData,
  UserProfile,
  UserProfileRepositoryPort,
} from '../../ports/user-profile.port';

/**
 * Update Profile Use Case
 *
 * Single Responsibility: Update the authenticated user's profile.
 * Returns domain entity (UserProfile), not envelope.
 */
export class UpdateProfileUseCase {
  constructor(private readonly repository: UserProfileRepositoryPort) {}

  async execute(userId: string, profileUpdateData: UpdateProfileData): Promise<UserProfile> {
    const existingUser = await this.repository.findUserById(userId);
    if (!existingUser) {
      throw new EntityNotFoundException('User');
    }

    const updatedUserProfile = await this.repository.updateUserProfile(userId, profileUpdateData);

    return updatedUserProfile;
  }
}
