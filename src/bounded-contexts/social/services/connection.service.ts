/**
 * Connection Service
 *
 * Handles LinkedIn-style connection operations between users.
 * Delegates persistence to ConnectionRepositoryPort.
 */

import { Inject, Injectable } from '@nestjs/common';
import { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import {
  ConflictException,
  EntityNotFoundException,
  ValidationException,
} from '@/shared-kernel/exceptions/domain.exceptions';
import {
  ConnectionRepositoryPort,
  type ConnectionUser,
  type ConnectionWithUser,
} from '../application/ports/connection.port';
import type { PaginatedResult, PaginationParams } from '../application/ports/follow.port';
import { SOCIAL_LOGGER_PORT, SocialLoggerPort } from '../application/ports/social-logger.port';
import { ConnectionAcceptedEvent, ConnectionRequestedEvent } from '../domain/events';

export type { ConnectionUser, ConnectionWithUser, PaginatedResult, PaginationParams };

export interface ConnectionSuggestion {
  id: string;
  name: string | null;
  username: string | null;
  photoURL: string | null;
  reason: string;
  score: number;
}

@Injectable()
export class ConnectionService {
  constructor(
    private readonly connectionRepo: ConnectionRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    @Inject(SOCIAL_LOGGER_PORT)
    private readonly logger: SocialLoggerPort,
  ) {}

  async sendConnectionRequest(requesterId: string, targetId: string): Promise<ConnectionWithUser> {
    if (requesterId === targetId) {
      throw new ValidationException('Cannot connect with yourself');
    }

    const targetExists = await this.connectionRepo.userExists(targetId);
    if (!targetExists) {
      throw new EntityNotFoundException('User');
    }

    const existing = await this.connectionRepo.findConnectionBetween(requesterId, targetId);

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        throw new ConflictException('Already connected with this user');
      }
      if (existing.status === 'PENDING') {
        throw new ConflictException('Connection request already pending');
      }
      if (existing.status === 'REJECTED') {
        throw new ConflictException('Connection request already exists');
      }
    }

    const connection = await this.connectionRepo.createConnection(requesterId, targetId);

    this.eventPublisher.publish(new ConnectionRequestedEvent(targetId, { requesterId }));

    this.logger.debug(
      `User ${requesterId} sent connection request to ${targetId}`,
      'ConnectionService',
    );

    return connection;
  }

  async acceptConnection(connectionId: string, currentUserId: string): Promise<ConnectionWithUser> {
    const connection = await this.connectionRepo.findConnectionById(connectionId);

    if (!connection) {
      throw new EntityNotFoundException('Connection');
    }
    if (connection.status !== 'PENDING') {
      throw new ValidationException('Connection request is not pending');
    }
    if (connection.targetId !== currentUserId) {
      throw new ValidationException('Only the target user can accept a connection request');
    }

    const updated = await this.connectionRepo.updateConnectionStatus(connectionId, 'ACCEPTED');

    this.eventPublisher.publish(
      new ConnectionAcceptedEvent(connection.requesterId, {
        requesterId: connection.requesterId,
        targetId: connection.targetId,
      }),
    );

    this.logger.debug(
      `User ${currentUserId} accepted connection from ${connection.requesterId}`,
      'ConnectionService',
    );

    return updated;
  }

  async rejectConnection(connectionId: string, currentUserId: string): Promise<ConnectionWithUser> {
    const connection = await this.connectionRepo.findConnectionById(connectionId);

    if (!connection) {
      throw new EntityNotFoundException('Connection');
    }
    if (connection.status !== 'PENDING') {
      throw new ValidationException('Connection request is not pending');
    }
    if (connection.targetId !== currentUserId) {
      throw new ValidationException('Only the target user can reject a connection request');
    }

    const updated = await this.connectionRepo.updateConnectionStatus(connectionId, 'REJECTED');

    this.logger.debug(
      `User ${currentUserId} rejected connection from ${connection.requesterId}`,
      'ConnectionService',
    );

    return updated;
  }

  async withdrawSentRequest(connectionId: string, currentUserId: string): Promise<void> {
    const connection = await this.connectionRepo.findConnectionById(connectionId);

    if (!connection) {
      throw new EntityNotFoundException('Connection');
    }
    if (connection.status !== 'PENDING') {
      throw new ValidationException('Connection request is not pending');
    }
    if (connection.requesterId !== currentUserId) {
      throw new ValidationException('Only the requester can withdraw a sent request');
    }

    await this.connectionRepo.deleteConnection(connectionId);

    this.logger.debug(
      `User ${currentUserId} withdrew sent connection request ${connectionId}`,
      'ConnectionService',
    );
  }

  async removeConnection(connectionId: string, currentUserId: string): Promise<void> {
    const connection = await this.connectionRepo.findConnectionById(connectionId);

    if (!connection) {
      throw new EntityNotFoundException('Connection');
    }
    if (connection.status !== 'ACCEPTED') {
      throw new ValidationException('Connection is not accepted');
    }
    if (connection.requesterId !== currentUserId && connection.targetId !== currentUserId) {
      throw new ValidationException('You are not part of this connection');
    }

    await this.connectionRepo.deleteConnection(connectionId);

    this.logger.debug(
      `User ${currentUserId} removed connection ${connectionId}`,
      'ConnectionService',
    );
  }

  async getPendingRequests(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<ConnectionWithUser & { user?: ConnectionUser }>> {
    const { page, limit } = pagination;
    const { data, total } = await this.connectionRepo.findPendingRequests(userId, pagination);

    return {
      data: data.map((conn) => ({
        ...conn,
        user: conn.requesterId === userId ? conn.target : conn.requester,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSentRequests(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<ConnectionWithUser & { user?: ConnectionUser }>> {
    const { page, limit } = pagination;
    const { data, total } = await this.connectionRepo.findSentRequests(userId, pagination);

    return {
      data: data.map((conn) => ({
        ...conn,
        user: conn.target,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getConnections(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<ConnectionWithUser & { user?: ConnectionUser }>> {
    const { page, limit } = pagination;
    const { data, total } = await this.connectionRepo.findAcceptedConnections(userId, pagination);

    return {
      data: data.map((conn) => ({
        ...conn,
        user: conn.requesterId === userId ? conn.target : conn.requester,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getConnectionsCount(userId: string): Promise<number> {
    return this.connectionRepo.countAcceptedConnections(userId);
  }

  async isConnected(userA: string, userB: string): Promise<boolean> {
    const connection = await this.connectionRepo.findConnectionBetween(userA, userB);
    return connection !== null && connection.status === 'ACCEPTED';
  }

  /**
   * Relationship summary between two users from userA's perspective.
   * `pendingSentConnectionId` is the connection row ID if userA has a pending
   * outbound request to userB — the caller uses it to offer a withdraw action.
   */
  async getConnectionStatusWith(
    userA: string,
    userB: string,
  ): Promise<{ isConnected: boolean; pendingSentConnectionId: string | null }> {
    const connection = await this.connectionRepo.findConnectionBetween(userA, userB);
    if (!connection) {
      return { isConnected: false, pendingSentConnectionId: null };
    }
    const isConnected = connection.status === 'ACCEPTED';
    const pendingSentConnectionId =
      connection.status === 'PENDING' && connection.requesterId === userA ? connection.id : null;
    return { isConnected, pendingSentConnectionId };
  }

  async getConnectionStats(userId: string): Promise<{ connections: number }> {
    const connections = await this.getConnectionsCount(userId);
    return { connections };
  }

  async getConnectionSuggestions(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<ConnectionSuggestion>> {
    const { page, limit } = pagination;
    const { data, total } = await this.connectionRepo.findRankedSuggestions(userId, pagination);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
