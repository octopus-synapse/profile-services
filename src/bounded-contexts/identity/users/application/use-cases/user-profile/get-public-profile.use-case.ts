import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import type { PublicProfileData } from '../../ports/user-profile.port';
import { UserProfileRepositoryPort } from '../../ports/user-profile.port';

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

    // The repository only returns rows where username is already set — we
    // defensively coerce to string to satisfy the DTO's non-nullable shape
    // without reaching for a non-null assertion.
    return {
      user: {
        id: foundUser.id,
        username: foundUser.username ?? '',
        name: foundUser.name,
        photoURL: foundUser.photoURL,
        bio: foundUser.bio,
        location: foundUser.location,
        website: foundUser.website,
        linkedin: foundUser.linkedin,
        github: foundUser.github,
      },
      resume: userResume ? projectPublicProfileResume(userResume) : null,
    };
  }
}

function projectPublicProfileResume(r: Record<string, unknown>): Record<string, unknown> {
  return {
    id: r.id,
    title: r.title ?? null,
    language: r.language,
    isPublic: r.isPublic,
    slug: r.slug ?? null,
    fullName: r.fullName ?? null,
    jobTitle: r.jobTitle ?? null,
    phone: r.phone ?? null,
    location: r.location ?? null,
    linkedin: r.linkedin ?? null,
    github: r.github ?? null,
    website: r.website ?? null,
    summary: r.summary ?? null,
    accentColor: r.accentColor ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}
