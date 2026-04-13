/**
 * Connection Service
 *
 * Handles LinkedIn-style connection operations between users.
 * Implements connection request/accept/reject workflow.
 *
 * Kent Beck: "Make it work, make it right, make it fast."
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { EventPublisher } from '@/shared-kernel';
import { ConnectionAcceptedEvent, ConnectionRequestedEvent } from '../domain/events';

// --- Types ---

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ConnectionUser {
  id: string;
  name: string | null;
  username: string | null;
  photoURL: string | null;
}

export interface ConnectionWithUser {
  id: string;
  requesterId: string;
  targetId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  requester?: ConnectionUser;
  target?: ConnectionUser;
}

const USER_SELECT = {
  id: true,
  name: true,
  username: true,
  photoURL: true,
} as const;

// --- Service ---

@Injectable()
export class ConnectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
    private readonly eventPublisher: EventPublisher,
  ) {}

  /**
   * Send a connection request.
   */
  async sendConnectionRequest(requesterId: string, targetId: string): Promise<ConnectionWithUser> {
    if (requesterId === targetId) {
      throw new BadRequestException('Cannot connect with yourself');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetId },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId, targetId },
          { requesterId: targetId, targetId: requesterId },
        ],
      },
    });

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

    const connection = await this.prisma.connection.create({
      data: { requesterId, targetId },
      include: {
        requester: { select: USER_SELECT },
        target: { select: USER_SELECT },
      },
    });

    this.eventPublisher.publish(new ConnectionRequestedEvent(targetId, { requesterId }));

    this.logger.debug(
      `User ${requesterId} sent connection request to ${targetId}`,
      'ConnectionService',
    );

    return connection;
  }

  /**
   * Accept a connection request.
   * Only the target (receiver) can accept.
   */
  async acceptConnection(connectionId: string, currentUserId: string): Promise<ConnectionWithUser> {
    const connection = await this.prisma.connection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException('Connection request not found');
    }

    if (connection.status !== 'PENDING') {
      throw new BadRequestException('Connection request is not pending');
    }

    if (connection.targetId !== currentUserId) {
      throw new BadRequestException('Only the target user can accept a connection request');
    }

    const updated = await this.prisma.connection.update({
      where: { id: connectionId },
      data: { status: 'ACCEPTED' },
      include: {
        requester: { select: USER_SELECT },
        target: { select: USER_SELECT },
      },
    });

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

  /**
   * Reject a connection request.
   * Only the target (receiver) can reject.
   */
  async rejectConnection(connectionId: string, currentUserId: string): Promise<ConnectionWithUser> {
    const connection = await this.prisma.connection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException('Connection request not found');
    }

    if (connection.status !== 'PENDING') {
      throw new BadRequestException('Connection request is not pending');
    }

    if (connection.targetId !== currentUserId) {
      throw new BadRequestException('Only the target user can reject a connection request');
    }

    const updated = await this.prisma.connection.update({
      where: { id: connectionId },
      data: { status: 'REJECTED' },
      include: {
        requester: { select: USER_SELECT },
        target: { select: USER_SELECT },
      },
    });

    this.logger.debug(
      `User ${currentUserId} rejected connection from ${connection.requesterId}`,
      'ConnectionService',
    );

    return updated;
  }

  /**
   * Remove an accepted connection.
   * Either side can remove.
   */
  async removeConnection(connectionId: string, currentUserId: string): Promise<void> {
    const connection = await this.prisma.connection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    if (connection.status !== 'ACCEPTED') {
      throw new BadRequestException('Connection is not accepted');
    }

    if (connection.requesterId !== currentUserId && connection.targetId !== currentUserId) {
      throw new BadRequestException('You are not part of this connection');
    }

    await this.prisma.connection.delete({
      where: { id: connectionId },
    });

    this.logger.debug(
      `User ${currentUserId} removed connection ${connectionId}`,
      'ConnectionService',
    );
  }

  /**
   * Get paginated list of pending connection requests for a user (received).
   */
  async getPendingRequests(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<ConnectionWithUser>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.connection.findMany({
        where: { targetId: userId, status: 'PENDING' },
        include: {
          requester: { select: USER_SELECT },
          target: { select: USER_SELECT },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.connection.count({
        where: { targetId: userId, status: 'PENDING' },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get paginated list of accepted connections for a user.
   */
  async getConnections(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<ConnectionWithUser>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.connection.findMany({
        where: {
          status: 'ACCEPTED',
          OR: [{ requesterId: userId }, { targetId: userId }],
        },
        include: {
          requester: { select: USER_SELECT },
          target: { select: USER_SELECT },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.connection.count({
        where: {
          status: 'ACCEPTED',
          OR: [{ requesterId: userId }, { targetId: userId }],
        },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get count of accepted connections.
   */
  async getConnectionsCount(userId: string): Promise<number> {
    return this.prisma.connection.count({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: userId }, { targetId: userId }],
      },
    });
  }

  /**
   * Check if two users are connected.
   */
  async isConnected(userA: string, userB: string): Promise<boolean> {
    const connection = await this.prisma.connection.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: userA, targetId: userB },
          { requesterId: userB, targetId: userA },
        ],
      },
    });

    return connection !== null;
  }

  /**
   * Get connection stats for a user.
   */
  async getConnectionStats(userId: string): Promise<{ connections: number }> {
    const connections = await this.getConnectionsCount(userId);
    return { connections };
  }

  /**
   * Get connection suggestions: users not connected, not pending, not self.
   */
  async getConnectionSuggestions(userId: string): Promise<ConnectionUser[]> {
    const existingConnections = await this.prisma.connection.findMany({
      where: {
        OR: [{ requesterId: userId }, { targetId: userId }],
      },
      select: { requesterId: true, targetId: true },
    });

    const excludeIds = new Set<string>([userId]);
    for (const conn of existingConnections) {
      excludeIds.add(conn.requesterId);
      excludeIds.add(conn.targetId);
    }

    return this.prisma.user.findMany({
      where: {
        id: { notIn: Array.from(excludeIds) },
        isActive: true,
      },
      select: USER_SELECT,
      take: 10,
    });
  }
}
