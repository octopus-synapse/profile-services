/**
 * Block Port
 *
 * Defines domain types and repository abstraction for block operations.
 */

import type { BlockedUserResponse, BlockUser } from '../../schemas/chat.schema';

// ============================================================================
// Domain Types
// ============================================================================

export type BlockedUserWithDetails = {
  id: string;
  blockerId: string;
  blockedId: string;
  reason: string | null;
  createdAt: Date;
  blocked: { id: string; name: string | null; photoURL: string | null; username: string | null };
};

// ============================================================================
// Repository Port (Abstraction)
// ============================================================================

export abstract class BlockRepositoryPort {
  abstract block(
    blockerId: string,
    blockedId: string,
    reason?: string,
  ): Promise<BlockedUserWithDetails>;
  abstract unblock(blockerId: string, blockedId: string): Promise<void>;
  abstract isBlocked(blockerId: string, blockedId: string): Promise<boolean>;
  abstract isBlockedBetween(userId1: string, userId2: string): Promise<boolean>;
  abstract getBlockedUsers(blockerId: string): Promise<BlockedUserWithDetails[]>;
}

// ============================================================================
// Use Cases Interface
// ============================================================================

export abstract class BlockUseCases {
  abstract readonly blockUserUseCase: {
    execute: (blockerId: string, dto: BlockUser) => Promise<BlockedUserResponse>;
  };
  abstract readonly unblockUserUseCase: {
    execute: (blockerId: string, blockedId: string) => Promise<void>;
  };
  abstract readonly getBlockedUsersUseCase: {
    execute: (userId: string) => Promise<BlockedUserResponse[]>;
  };
  abstract readonly checkBlockStatusUseCase: {
    execute: (blockerId: string, blockedId: string) => Promise<boolean>;
  };
}
