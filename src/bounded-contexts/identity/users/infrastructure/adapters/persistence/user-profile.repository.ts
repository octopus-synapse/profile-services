import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { ResumesRepository } from '@/bounded-contexts/resumes/resumes/resumes.repository';
import type { UpdateProfileData, UserProfile } from '../../../application/ports/user-profile.port';
import { UserProfileRepositoryPort } from '../../../application/ports/user-profile.port';

export class UserProfileRepository extends UserProfileRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resumesRepository: ResumesRepository,
  ) {
    super();
  }

  async findUserByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        displayName: true,
        photoURL: true,
        bio: true,
        location: true,
        website: true,
        linkedin: true,
        github: true,
        preferences: {
          select: { profileVisibility: true },
        },
      },
    });
  }

  async findResumeByUserId(userId: string): Promise<Record<string, unknown> | null> {
    return this.resumesRepository.findResumeByUserId(userId);
  }

  async findUserProfileById(userId: string): Promise<UserProfile | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async findUserById(userId: string): Promise<{ id: string } | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
  }

  async updateUserProfile(userId: string, data: UpdateProfileData): Promise<UserProfile> {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }
}
