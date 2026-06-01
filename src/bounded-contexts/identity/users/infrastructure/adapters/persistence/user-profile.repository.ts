import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { ResumesRepository } from '@/bounded-contexts/resumes/core/resumes.repository';
import type {
  PublicUserListItem,
  UpdateProfileData,
  UserProfile,
} from '../../../application/ports/user-profile.port';
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
        username: true,
        name: true,
        photoURL: true,
        bio: true,
        headline: true,
        location: true,
        website: true,
        portfolio: true,
        linkedin: true,
        github: true,
      },
    });
  }

  async findResumeByUserId(userId: string): Promise<Record<string, unknown> | null> {
    return this.resumesRepository.findResumeByUserId(userId);
  }

  async findUserProfileById(userId: string): Promise<UserProfile | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        photoURL: true,
        bio: true,
        headline: true,
        location: true,
        phone: true,
        website: true,
        portfolio: true,
        linkedin: true,
        github: true,
        createdAt: true,
        updatedAt: true,
      },
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

  async listPublicUsers(
    page: number,
    limit: number,
  ): Promise<{ items: PublicUserListItem[]; total: number }> {
    const where = { username: { not: null }, isActive: true } as const;
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: { username: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    const items: PublicUserListItem[] = rows
      .filter((r): r is { username: string; updatedAt: Date } => r.username !== null)
      .map((r) => ({ username: r.username, updatedAt: r.updatedAt }));
    return { items, total };
  }
}
