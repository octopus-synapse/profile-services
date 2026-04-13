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

export interface ConnectionSuggestion {
  id: string;
  name: string | null;
  username: string | null;
  photoURL: string | null;
  reason: string;
  score: number;
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

interface SuggestionRow {
  id: string;
  name: string | null;
  username: string | null;
  photoURL: string | null;
  reason: string;
  score: number;
  total_count: number;
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
      data: data.map((conn) => ({
        ...conn,
        user: conn.requesterId === userId ? conn.requester : conn.target,
      })),
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
   * Get connection suggestions ranked by relevance.
   *
   * Signals (with weights):
   * - direct_follow: user follows this candidate (weight 10)
   * - second_degree_follows: people the user follows who also follow candidate (weight 3 each)
   * - mutual_connections: user's connections who are also connected to candidate (weight 4 each)
   *
   * Excludes: self, anyone with existing Connection record (PENDING/ACCEPTED/REJECTED).
   */
  async getConnectionSuggestions(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<ConnectionSuggestion>> {
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    const rows = await this.prisma.$queryRaw<SuggestionRow[]>`
      WITH excluded AS (
        SELECT ${userId}::text AS id
        UNION
        SELECT CASE WHEN "requesterId" = ${userId} THEN "targetId" ELSE "requesterId" END
        FROM "Connection"
        WHERE "requesterId" = ${userId} OR "targetId" = ${userId}
      ),
      my_connections AS (
        SELECT CASE WHEN "requesterId" = ${userId} THEN "targetId" ELSE "requesterId" END AS user_id
        FROM "Connection"
        WHERE ("requesterId" = ${userId} OR "targetId" = ${userId})
          AND status = 'ACCEPTED'
      ),
      my_following AS (
        SELECT "followingId" AS user_id
        FROM "Follow"
        WHERE "followerId" = ${userId}
      ),
      candidates AS (
        SELECT
          u.id,
          u.name,
          u.username,
          u."photoURL",
          CASE WHEN EXISTS (
            SELECT 1 FROM my_following mf WHERE mf.user_id = u.id
          ) THEN 1 ELSE 0 END AS direct_follow,
          (SELECT COUNT(*)::int FROM my_following mf
           JOIN "Follow" f ON f."followerId" = mf.user_id AND f."followingId" = u.id
          ) AS second_degree_follows,
          (SELECT COUNT(*)::int FROM my_connections mc
           JOIN "Connection" c ON c.status = 'ACCEPTED'
             AND (
               (c."requesterId" = mc.user_id AND c."targetId" = u.id) OR
               (c."targetId" = mc.user_id AND c."requesterId" = u.id)
             )
          ) AS mutual_connections
        FROM "User" u
        WHERE u."isActive" = true
          AND u.id NOT IN (SELECT id FROM excluded)
      ),
      scored AS (
        SELECT
          c.id, c.name, c.username, c."photoURL",
          (c.direct_follow * 10 + c.second_degree_follows * 3 + c.mutual_connections * 4) AS score,
          CASE
            WHEN c.mutual_connections >= 1 THEN
              c.mutual_connections || ' mutual connection' || CASE WHEN c.mutual_connections > 1 THEN 's' ELSE '' END
            WHEN c.direct_follow = 1 THEN
              'Followed by you'
            WHEN c.second_degree_follows >= 1 THEN
              'Followed by @' || COALESCE(
                (SELECT u2.username FROM my_following mf
                 JOIN "Follow" f ON f."followerId" = mf.user_id AND f."followingId" = c.id
                 JOIN "User" u2 ON u2.id = mf.user_id
                 LIMIT 1),
                'someone you follow'
              )
            ELSE 'Suggested for you'
          END AS reason,
          COUNT(*) OVER()::int AS total_count
        FROM candidates c
      )
      SELECT id, name, username, "photoURL", reason, score, total_count
      FROM scored
      ORDER BY score DESC, name ASC, id ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const total = rows.length > 0 ? Number(rows[0].total_count) : 0;

    return {
      data: rows.map(({ total_count, ...row }) => ({
        ...row,
        score: Number(row.score),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
