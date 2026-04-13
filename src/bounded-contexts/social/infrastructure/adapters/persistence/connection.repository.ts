import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  ConnectionRepositoryPort,
  type ConnectionUser,
  type ConnectionWithUser,
  type PaginationParams,
} from '../../../application/ports/connection.port';

const USER_SELECT = {
  id: true,
  name: true,
  username: true,
  photoURL: true,
} as const;

export class ConnectionRepository extends ConnectionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async createConnection(requesterId: string, targetId: string): Promise<ConnectionWithUser> {
    return this.prisma.connection.create({
      data: { requesterId, targetId },
      include: {
        requester: { select: USER_SELECT },
        target: { select: USER_SELECT },
      },
    });
  }

  async findConnectionById(id: string): Promise<ConnectionWithUser | null> {
    return this.prisma.connection.findUnique({
      where: { id },
      include: {
        requester: { select: USER_SELECT },
        target: { select: USER_SELECT },
      },
    });
  }

  async findConnection(requesterId: string, targetId: string): Promise<ConnectionWithUser | null> {
    return this.prisma.connection.findUnique({
      where: {
        requesterId_targetId: { requesterId, targetId },
      },
      include: {
        requester: { select: USER_SELECT },
        target: { select: USER_SELECT },
      },
    });
  }

  async findConnectionBetween(userA: string, userB: string): Promise<ConnectionWithUser | null> {
    return this.prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: userA, targetId: userB },
          { requesterId: userB, targetId: userA },
        ],
      },
      include: {
        requester: { select: USER_SELECT },
        target: { select: USER_SELECT },
      },
    });
  }

  async updateConnectionStatus(
    id: string,
    status: 'ACCEPTED' | 'REJECTED',
  ): Promise<ConnectionWithUser> {
    return this.prisma.connection.update({
      where: { id },
      data: { status },
      include: {
        requester: { select: USER_SELECT },
        target: { select: USER_SELECT },
      },
    });
  }

  async deleteConnection(id: string): Promise<void> {
    await this.prisma.connection.delete({
      where: { id },
    });
  }

  async findPendingRequests(
    userId: string,
    pagination: PaginationParams,
  ): Promise<{ data: ConnectionWithUser[]; total: number }> {
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

    return { data, total };
  }

  async findAcceptedConnections(
    userId: string,
    pagination: PaginationParams,
  ): Promise<{ data: ConnectionWithUser[]; total: number }> {
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

    return { data, total };
  }

  async countAcceptedConnections(userId: string): Promise<number> {
    return this.prisma.connection.count({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: userId }, { targetId: userId }],
      },
    });
  }

  async findSuggestions(userId: string, limit: number): Promise<ConnectionUser[]> {
    // Find users that the current user is NOT connected to (no connection record at all)
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
      take: limit,
    });
  }

  async userExists(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    return user !== null;
  }
}
