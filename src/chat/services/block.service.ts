import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { BlockedUserRepository } from '../repositories/blocked-user.repository';
import type {
  BlockUser,
  BlockedUserResponse,
} from '@octopus-synapse/profile-contracts';

@Injectable()
export class BlockService {
  constructor(private readonly blockedUserRepo: BlockedUserRepository) {}

  /**
   * Block a user.
   */
  async blockUser(
    blockerId: string,
    dto: BlockUser,
  ): Promise<BlockedUserResponse> {
    if (blockerId === dto.userId) {
      throw new BadRequestException('Cannot block yourself');
    }

    const record = await this.blockedUserRepo.block(
      blockerId,
      dto.userId,
      dto.reason,
    );

    return {
      id: record.id,
      blockedAt: record.createdAt.toISOString(),
      reason: record.reason,
      user: {
        id: record.blocked.id,
        displayName: record.blocked.displayName,
        photoURL: record.blocked.photoURL,
        username: record.blocked.username,
      },
    };
  }

  /**
   * Unblock a user.
   */
  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    const isBlocked = await this.blockedUserRepo.isBlocked(blockerId, blockedId);
    if (!isBlocked) {
      throw new NotFoundException('User is not blocked');
    }

    await this.blockedUserRepo.unblock(blockerId, blockedId);
  }

  /**
   * Get all blocked users.
   */
  async getBlockedUsers(userId: string): Promise<BlockedUserResponse[]> {
    const records = await this.blockedUserRepo.getBlockedUsers(userId);

    return records.map((record) => ({
      id: record.id,
      blockedAt: record.createdAt.toISOString(),
      reason: record.reason,
      user: {
        id: record.blocked.id,
        displayName: record.blocked.displayName,
        photoURL: record.blocked.photoURL,
        username: record.blocked.username,
      },
    }));
  }

  /**
   * Check if user A has blocked user B.
   */
  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    return this.blockedUserRepo.isBlocked(blockerId, blockedId);
  }

  /**
   * Check if either user has blocked the other.
   */
  async isBlockedBetween(userId1: string, userId2: string): Promise<boolean> {
    return this.blockedUserRepo.isBlockedBetween(userId1, userId2);
  }
}
