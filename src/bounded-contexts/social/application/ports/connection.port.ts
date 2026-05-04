/**
 * Connection Port
 *
 * Defines domain types and repository abstraction for connection operations.
 */

import type { PaginationParams } from './follow.port';

export type { PaginationParams } from './follow.port';

// ============================================================================
// Domain Types
// ============================================================================

export type ConnectionUser = {
  id: string;
  name: string | null;
  username: string | null;
  photoURL: string | null;
};

export type ConnectionWithUser = {
  id: string;
  requesterId: string;
  targetId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: Date;
  updatedAt: Date;
  requester?: ConnectionUser;
  target?: ConnectionUser;
};

// ============================================================================
// Repository Port (Abstraction)
// ============================================================================

export abstract class ConnectionRepositoryPort {
  abstract createConnection(requesterId: string, targetId: string): Promise<ConnectionWithUser>;

  abstract findConnectionById(id: string): Promise<ConnectionWithUser | null>;

  abstract findConnection(
    requesterId: string,
    targetId: string,
  ): Promise<ConnectionWithUser | null>;

  abstract findConnectionBetween(userA: string, userB: string): Promise<ConnectionWithUser | null>;

  abstract updateConnectionStatus(
    id: string,
    status: 'ACCEPTED' | 'REJECTED',
  ): Promise<ConnectionWithUser>;

  abstract deleteConnection(id: string): Promise<void>;

  abstract findPendingRequests(
    userId: string,
    pagination: PaginationParams,
  ): Promise<{ items: ConnectionWithUser[]; total: number }>;

  abstract findSentRequests(
    userId: string,
    pagination: PaginationParams,
  ): Promise<{ items: ConnectionWithUser[]; total: number }>;

  abstract findAcceptedConnections(
    userId: string,
    pagination: PaginationParams,
  ): Promise<{ items: ConnectionWithUser[]; total: number }>;

  abstract countAcceptedConnections(userId: string): Promise<number>;

  abstract findSuggestions(userId: string, limit: number): Promise<ConnectionUser[]>;

  abstract findRankedSuggestions(
    userId: string,
    pagination: PaginationParams,
  ): Promise<{
    items: Array<
      ConnectionUser & {
        reason: string;
        score: number;
        mutualCount: number;
        commonSkills: string[];
      }
    >;
    total: number;
  }>;

  abstract userExists(userId: string): Promise<boolean>;
}

// ============================================================================
// Use Cases Interface
// ============================================================================

export abstract class ConnectionUseCases {
  abstract readonly sendConnectionRequestUseCase: {
    execute: (requesterId: string, targetId: string) => Promise<ConnectionWithUser>;
  };
  abstract readonly acceptConnectionUseCase: {
    execute: (connectionId: string, currentUserId: string) => Promise<ConnectionWithUser>;
  };
  abstract readonly rejectConnectionUseCase: {
    execute: (connectionId: string, currentUserId: string) => Promise<ConnectionWithUser>;
  };
  abstract readonly removeConnectionUseCase: {
    execute: (connectionId: string, currentUserId: string) => Promise<void>;
  };
  abstract readonly getPendingRequestsUseCase: {
    execute: (
      userId: string,
      pagination: PaginationParams,
    ) => Promise<{
      items: ConnectionWithUser[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>;
  };
  abstract readonly getConnectionsUseCase: {
    execute: (
      userId: string,
      pagination: PaginationParams,
    ) => Promise<{
      items: ConnectionWithUser[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>;
  };
  abstract readonly getConnectionStatsUseCase: {
    execute: (userId: string) => Promise<{ connections: number }>;
  };
  abstract readonly checkConnectedUseCase: {
    execute: (userA: string, userB: string) => Promise<boolean>;
  };
  abstract readonly getConnectionSuggestionsUseCase: {
    execute: (userId: string) => Promise<ConnectionUser[]>;
  };
}
