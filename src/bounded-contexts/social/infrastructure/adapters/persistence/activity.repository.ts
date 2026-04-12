import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { ActivityType } from '../../../application/ports/activity.port';
import {
  ActivityRepositoryPort,
  type ActivityWithUser,
} from '../../../application/ports/activity.port';
import type { PaginationParams } from '../../../application/ports/follow.port';

const USER_SELECT = {
  id: true,
  name: true,
  username: true,
  photoURL: true,
} as const;

export class ActivityRepository extends ActivityRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async createActivity(data: {
    userId: string;
    type: ActivityType;
    metadata?: unknown;
    entityId?: string;
    entityType?: string;
  }): Promise<ActivityWithUser> {
    return this.prisma.activity.create({
      data: {
        userId: data.userId,
        type: data.type,
        metadata: data.metadata ?? undefined,
        entityId: data.entityId,
        entityType: data.entityType,
      },
    }) as Promise<ActivityWithUser>;
  }

  async findActivityWithUser(activityId: string): Promise<ActivityWithUser | null> {
    return this.prisma.activity.findUnique({
      where: { id: activityId },
      include: { user: { select: USER_SELECT } },
    }) as Promise<ActivityWithUser | null>;
  }

  async findActivitiesByUserIds(
    userIds: string[],
    pagination: PaginationParams,
  ): Promise<{ data: ActivityWithUser[]; total: number }> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.activity.findMany({
        where: { userId: { in: userIds } },
        include: { user: { select: USER_SELECT } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.activity.count({ where: { userId: { in: userIds } } }),
    ]);

    return { data: data as ActivityWithUser[], total };
  }

  async findUserActivities(
    userId: string,
    pagination: PaginationParams,
  ): Promise<{ data: ActivityWithUser[]; total: number }> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.activity.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.activity.count({ where: { userId } }),
    ]);

    return { data: data as ActivityWithUser[], total };
  }

  async findUserActivitiesByType(
    userId: string,
    type: ActivityType,
    pagination: PaginationParams,
  ): Promise<{ data: ActivityWithUser[]; total: number }> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.activity.findMany({
        where: { userId, type },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.activity.count({ where: { userId, type } }),
    ]);

    return { data: data as ActivityWithUser[], total };
  }

  async deleteOlderThan(date: Date): Promise<number> {
    const result = await this.prisma.activity.deleteMany({
      where: { createdAt: { lt: date } },
    });
    return result.count;
  }
}
