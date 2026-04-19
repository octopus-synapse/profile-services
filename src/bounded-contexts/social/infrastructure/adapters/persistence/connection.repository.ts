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

  async findSentRequests(
    userId: string,
    pagination: PaginationParams,
  ): Promise<{ data: ConnectionWithUser[]; total: number }> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.connection.findMany({
        where: { requesterId: userId, status: 'PENDING' },
        include: {
          requester: { select: USER_SELECT },
          target: { select: USER_SELECT },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.connection.count({
        where: { requesterId: userId, status: 'PENDING' },
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

  async findRankedSuggestions(
    userId: string,
    pagination: PaginationParams,
  ): Promise<{
    data: Array<ConnectionUser & { reason: string; score: number }>;
    total: number;
  }> {
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
      data: rows.map(({ total_count: _total, ...row }) => ({
        ...row,
        score: Number(row.score),
      })),
      total,
    };
  }

  async userExists(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    return user !== null;
  }
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
