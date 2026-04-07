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
  blocked: {
    id: string;
    displayName: string | null;
    photoURL: string | null;
    username: string | null;
  };
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

export const BLOCK_USE_CASES = Symbol('BLOCK_USE_CASES');

export interface BlockUseCases {
  blockUserUseCase: {
    execute: (blockerId: string, dto: BlockUser) => Promise<BlockedUserResponse>;
  };
  unblockUserUseCase: {
    execute: (blockerId: string, blockedId: string) => Promise<void>;
  };
  getBlockedUsersUseCase: {
    execute: (userId: string) => Promise<BlockedUserResponse[]>;
  };
  checkBlockStatusUseCase: {
    execute: (blockerId: string, blockedId: string) => Promise<boolean>;
  };
}
