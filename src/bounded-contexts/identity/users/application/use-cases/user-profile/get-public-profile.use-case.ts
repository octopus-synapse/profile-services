import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import type { PublicProfileData, UserProfileRepositoryPort } from '../../ports/user-profile.port';

/**
 * Get Public Profile Use Case
 *
 * Single Responsibility: Retrieve a user's public profile by username.
 * Returns domain entity (PublicProfileData), not envelope.
 */
export class GetPublicProfileUseCase {
  constructor(private readonly repository: UserProfileRepositoryPort) {}

  async execute(username: string): Promise<PublicProfileData> {
    const foundUser = await this.repository.findUserByUsername(username);

    if (!foundUser) {
      throw new EntityNotFoundException('Public profile');
    }

    const userResume = await this.repository.findResumeByUserId(foundUser.id);

    return {
      user: {
        id: foundUser.id,
        username: foundUser.username!,
        name: foundUser.name,
        photoURL: foundUser.photoURL,
        bio: foundUser.bio,
        location: foundUser.location,
        website: foundUser.website,
        linkedin: foundUser.linkedin,
        github: foundUser.github,
      },
      resume: userResume,
    };
  }
}
