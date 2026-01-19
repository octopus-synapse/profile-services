/**
 * Social Repository
 * Low-level persistence operations for Follow and Activity entities.
 *
 * Responsibility: All Prisma operations for social features.
 * Dependencies point inward: Repository depends only on PrismaService.
 */

import { Injectable } from '@nestjs/common';
import { ActivityType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// --- Types ---

const USER_SELECT = {
  id: true,
  name: true,
  username: true,
  displayName: true,
  photoURL: true,
} as const;

export interface FollowFindManyOptions {
  where: Prisma.FollowWhereInput;
  skip: number;
  take: number;
}

export interface ActivityFindManyOptions {
  where: Prisma.ActivityWhereInput;
  skip: number;
  take: number;
}

export interface ActivityCreateData {
  userId: string;
  type: ActivityType;
  metadata?: unknown;
  entityId?: string;
  entityType?: string;
}

// --- Repository ---

@Injectable()
export class SocialRepository {
  constructor(private readonly prisma: PrismaService) {}

  // --- Follow Operations ---

  async findUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async findFollow(followerId: string, followingId: string) {
    return this.prisma.follow.findFirst({
      where: { followerId, followingId },
    });
  }

  async createFollow(followerId: string, followingId: string) {
    return this.prisma.follow.create({
      data: { followerId, followingId },
      include: {
        following: { select: USER_SELECT },
      },
    });
  }

  async deleteFollow(followerId: string, followingId: string) {
    return this.prisma.follow.deleteMany({
      where: { followerId, followingId },
    });
  }

  async findFollowersWithPagination(
    userId: string,
    options: Omit<FollowFindManyOptions, 'where'>,
  ) {
    return this.prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: { select: USER_SELECT },
      },
      orderBy: { createdAt: 'desc' },
      skip: options.skip,
      take: options.take,
    });
  }

  async countFollowers(userId: string) {
    return this.prisma.follow.count({
      where: { followingId: userId },
    });
  }

  async findFollowingWithPagination(
    userId: string,
    options: Omit<FollowFindManyOptions, 'where'>,
  ) {
    return this.prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: { select: USER_SELECT },
      },
      orderBy: { createdAt: 'desc' },
      skip: options.skip,
      take: options.take,
    });
  }

  async countFollowing(userId: string) {
    return this.prisma.follow.count({
      where: { followerId: userId },
    });
  }

  async findFollowingIds(userId: string) {
    return this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
  }

  // --- Activity Operations ---

  async createActivity(data: ActivityCreateData) {
    return this.prisma.activity.create({
      data: {
        userId: data.userId,
        type: data.type,
        metadata: data.metadata ?? undefined,
        entityId: data.entityId,
        entityType: data.entityType,
      },
    });
  }

  async findActivitiesWithPagination(
    options: ActivityFindManyOptions,
    includeUser = false,
  ) {
    return this.prisma.activity.findMany({
      where: options.where,
      include: includeUser ? { user: { select: USER_SELECT } } : undefined,
      orderBy: { createdAt: 'desc' },
      skip: options.skip,
      take: options.take,
    });
  }

  async countActivities(where: Prisma.ActivityWhereInput) {
    return this.prisma.activity.count({ where });
  }

  async deleteActivitiesOlderThan(cutoffDate: Date) {
    return this.prisma.activity.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });
  }
}
