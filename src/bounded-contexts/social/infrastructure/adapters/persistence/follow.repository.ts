import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  FollowRepositoryPort,
  type FollowWithUser,
  type PaginationParams,
} from '../../../application/ports/follow.port';

const USER_SELECT = {
  id: true,
  name: true,
  username: true,
  photoURL: true,
} as const;

export class FollowRepository extends FollowRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async createFollow(followerId: string, followingId: string): Promise<FollowWithUser> {
    return this.prisma.follow.create({
      data: { followerId, followingId },
      include: {
        following: { select: USER_SELECT },
      },
    });
  }

  async deleteFollow(followerId: string, followingId: string): Promise<void> {
    await this.prisma.follow.deleteMany({
      where: { followerId, followingId },
    });
  }

  async findFollow(followerId: string, followingId: string): Promise<FollowWithUser | null> {
    return this.prisma.follow.findFirst({
      where: { followerId, followingId },
    });
  }

  async findFollowers(
    userId: string,
    pagination: PaginationParams,
  ): Promise<{ data: FollowWithUser[]; total: number }> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followingId: userId },
        include: { follower: { select: USER_SELECT } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.follow.count({ where: { followingId: userId } }),
    ]);

    return { data, total };
  }

  async findFollowing(
    userId: string,
    pagination: PaginationParams,
  ): Promise<{ data: FollowWithUser[]; total: number }> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followerId: userId },
        include: { following: { select: USER_SELECT } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.follow.count({ where: { followerId: userId } }),
    ]);

    return { data, total };
  }

  async countFollowers(userId: string): Promise<number> {
    return this.prisma.follow.count({ where: { followingId: userId } });
  }

  async countFollowing(userId: string): Promise<number> {
    return this.prisma.follow.count({ where: { followerId: userId } });
  }

  async findFollowingIds(userId: string): Promise<string[]> {
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    return following.map((f) => f.followingId);
  }

  async findFollowerIds(userId: string): Promise<string[]> {
    const followers = await this.prisma.follow.findMany({
      where: { followingId: userId },
      select: { followerId: true },
    });
    return followers.map((f) => f.followerId);
  }

  async userExists(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    return user !== null;
  }
}
