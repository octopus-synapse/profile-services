import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BlockedUserRepository } from '../repositories/blocked-user.repository';
import { BlockService } from './block.service';

// Helper to type mocked repository methods
type Mocked<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? ReturnType<typeof mock> & ((...args: A) => R)
    : T[K];
};

describe('BlockService', () => {
  let service: BlockService;
  let blockedUserRepo: Mocked<BlockedUserRepository>;

  const mockBlockedUser = {
    id: 'block1',
    blockerId: 'user1',
    blockedId: 'user2',
    reason: 'spam',
    createdAt: new Date(),
    blocked: {
      id: 'user2',
      displayName: 'User 2',
      photoURL: null,
      username: 'user2',
    },
  };

  beforeEach(async () => {
    // Create mock functions using Bun's mock()
    const mockRepo = {
      block: mock<(blockerId: string, blockedId: string, reason?: string) => Promise<void>>(),
      unblock: mock<(blockerId: string, blockedId: string) => Promise<void>>(),
      isBlocked: mock<(blockerId: string, blockedId: string) => Promise<boolean>>(),
      isBlockedBetween: mock<(userId1: string, userId2: string) => Promise<boolean>>(),
      getBlockedUsers: mock<(userId: string) => Promise<unknown[]>>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [BlockService, { provide: BlockedUserRepository, useValue: mockRepo }],
    }).compile();

    service = module.get<BlockService>(BlockService);
    blockedUserRepo = module.get(BlockedUserRepository) as Mocked<BlockedUserRepository>;
  });

  describe('blockUser', () => {
    it('should block a user', async () => {
      blockedUserRepo.block.mockResolvedValue(mockBlockedUser);

      const result = await service.blockUser('user1', {
        userId: 'user2',
        reason: 'spam',
      });

      expect(result).toBeDefined();
      expect(result.user.id).toBe('user2');
      expect(result.reason).toBe('spam');
      expect(blockedUserRepo.block).toHaveBeenCalledWith('user1', 'user2', 'spam');
    });

    it('should throw BadRequestException when blocking yourself', async () => {
      await expect(service.blockUser('user1', { userId: 'user1' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('unblockUser', () => {
    it('should unblock a user', async () => {
      blockedUserRepo.isBlocked.mockResolvedValue(true);
      blockedUserRepo.unblock.mockResolvedValue(mockBlockedUser);

      await service.unblockUser('user1', 'user2');

      expect(blockedUserRepo.unblock).toHaveBeenCalledWith('user1', 'user2');
    });

    it('should throw NotFoundException if user is not blocked', async () => {
      blockedUserRepo.isBlocked.mockResolvedValue(false);

      await expect(service.unblockUser('user1', 'user2')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBlockedUsers', () => {
    it('should return list of blocked users', async () => {
      blockedUserRepo.getBlockedUsers.mockResolvedValue([mockBlockedUser]);

      const result = await service.getBlockedUsers('user1');

      expect(result).toHaveLength(1);
      expect(result[0].user.id).toBe('user2');
    });

    it('should return empty array if no blocked users', async () => {
      blockedUserRepo.getBlockedUsers.mockResolvedValue([]);

      const result = await service.getBlockedUsers('user1');

      expect(result).toHaveLength(0);
    });
  });

  describe('isBlocked', () => {
    it('should return true if user is blocked', async () => {
      blockedUserRepo.isBlocked.mockResolvedValue(true);

      const result = await service.isBlocked('user1', 'user2');

      expect(result).toBe(true);
    });

    it('should return false if user is not blocked', async () => {
      blockedUserRepo.isBlocked.mockResolvedValue(false);

      const result = await service.isBlocked('user1', 'user2');

      expect(result).toBe(false);
    });
  });

  describe('isBlockedBetween', () => {
    it('should return true if either user blocked the other', async () => {
      blockedUserRepo.isBlockedBetween.mockResolvedValue(true);

      const result = await service.isBlockedBetween('user1', 'user2');

      expect(result).toBe(true);
    });

    it('should return false if no block exists', async () => {
      blockedUserRepo.isBlockedBetween.mockResolvedValue(false);

      const result = await service.isBlockedBetween('user1', 'user2');

      expect(result).toBe(false);
    });
  });
});
