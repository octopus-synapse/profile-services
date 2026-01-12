import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BlockedUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Block a user.
   */
  async block(blockerId: string, blockedId: string, reason?: string) {
    return this.prisma.blockedUser.upsert({
      where: {
        blockerId_blockedId: { blockerId, blockedId },
      },
      create: {
        blockerId,
        blockedId,
        reason,
      },
      update: {
        reason,
        createdAt: new Date(),
      },
      include: {
        blocked: {
          select: {
            id: true,
            displayName: true,
            photoURL: true,
            username: true,
          },
        },
      },
    });
  }

  /**
   * Unblock a user.
   */
  async unblock(blockerId: string, blockedId: string) {
    return this.prisma.blockedUser.delete({
      where: {
        blockerId_blockedId: { blockerId, blockedId },
      },
    });
  }

  /**
   * Check if user A has blocked user B.
   */
  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const record = await this.prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedId: { blockerId, blockedId },
      },
    });
    return !!record;
  }

  /**
   * Check if either user has blocked the other.
   */
  async isBlockedBetween(userId1: string, userId2: string): Promise<boolean> {
    const record = await this.prisma.blockedUser.findFirst({
      where: {
        OR: [
          { blockerId: userId1, blockedId: userId2 },
          { blockerId: userId2, blockedId: userId1 },
        ],
      },
    });
    return !!record;
  }

  /**
   * Get all users blocked by a user.
   */
  async getBlockedUsers(blockerId: string) {
    return this.prisma.blockedUser.findMany({
      where: { blockerId },
      orderBy: { createdAt: 'desc' },
      include: {
        blocked: {
          select: {
            id: true,
            displayName: true,
            photoURL: true,
            username: true,
          },
        },
      },
    });
  }

  /**
   * Get IDs of all users blocked by a user.
   */
  async getBlockedUserIds(blockerId: string): Promise<string[]> {
    const records = await this.prisma.blockedUser.findMany({
      where: { blockerId },
      select: { blockedId: true },
    });
    return records.map((r) => r.blockedId);
  }

  /**
   * Get IDs of users who have blocked a specific user.
   */
  async getBlockedByUserIds(blockedId: string): Promise<string[]> {
    const records = await this.prisma.blockedUser.findMany({
      where: { blockedId },
      select: { blockerId: true },
    });
    return records.map((r) => r.blockerId);
  }
}
