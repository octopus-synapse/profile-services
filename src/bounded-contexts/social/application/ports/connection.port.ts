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
  ): Promise<{ data: ConnectionWithUser[]; total: number }>;

  abstract findSentRequests(
    userId: string,
    pagination: PaginationParams,
  ): Promise<{ data: ConnectionWithUser[]; total: number }>;

  abstract findAcceptedConnections(
    userId: string,
    pagination: PaginationParams,
  ): Promise<{ data: ConnectionWithUser[]; total: number }>;

  abstract countAcceptedConnections(userId: string): Promise<number>;

  abstract findSuggestions(userId: string, limit: number): Promise<ConnectionUser[]>;

  abstract findRankedSuggestions(
    userId: string,
    pagination: PaginationParams,
  ): Promise<{
    data: Array<ConnectionUser & { reason: string; score: number }>;
    total: number;
  }>;

  abstract userExists(userId: string): Promise<boolean>;
}

// ============================================================================
// Use Cases Interface
// ============================================================================

export const CONNECTION_USE_CASES = Symbol('CONNECTION_USE_CASES');

export interface ConnectionUseCases {
  sendConnectionRequestUseCase: {
    execute: (requesterId: string, targetId: string) => Promise<ConnectionWithUser>;
  };
  acceptConnectionUseCase: {
    execute: (connectionId: string, currentUserId: string) => Promise<ConnectionWithUser>;
  };
  rejectConnectionUseCase: {
    execute: (connectionId: string, currentUserId: string) => Promise<ConnectionWithUser>;
  };
  removeConnectionUseCase: {
    execute: (connectionId: string, currentUserId: string) => Promise<void>;
  };
  getPendingRequestsUseCase: {
    execute: (
      userId: string,
      pagination: PaginationParams,
    ) => Promise<{
      data: ConnectionWithUser[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>;
  };
  getConnectionsUseCase: {
    execute: (
      userId: string,
      pagination: PaginationParams,
    ) => Promise<{
      data: ConnectionWithUser[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>;
  };
  getConnectionStatsUseCase: {
    execute: (userId: string) => Promise<{ connections: number }>;
  };
  checkConnectedUseCase: {
    execute: (userA: string, userB: string) => Promise<boolean>;
  };
  getConnectionSuggestionsUseCase: {
    execute: (userId: string) => Promise<ConnectionUser[]>;
  };
}
