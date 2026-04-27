import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  type SessionDevicePort,
  type SessionDeviceView,
} from '../../application/ports/session-device.port';

export type { SessionDeviceView };

/**
 * Adapter service that reads/revokes refresh-token records tied to a user's
 * sessions. Kept as an infrastructure adapter (not a domain use-case) because
 * it's a thin persistence facade over RefreshToken rows — the authentication
 * domain owns its own ports/use-cases separately.
 *
 * Implements `SessionDevicePort` so framework-free route descriptors can
 * depend on the abstract port via the BC's HTTP bundle.
 */
@Injectable()
export class SessionDeviceService implements SessionDevicePort {
  constructor(private readonly prisma: PrismaService) {}

  async listActiveForUser(userId: string): Promise<SessionDeviceView[]> {
    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        ipAddress: true,
        userAgent: true,
        deviceName: true,
        authMethod: true,
        revokedAt: true,
      },
    });
    return tokens.map(SessionDeviceService.toView);
  }

  async revokeForUser(userId: string, id: string): Promise<void> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { id, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count === 0) {
      throw new NotFoundException('Session not found or already revoked');
    }
  }

  private static toView(t: {
    id: string;
    createdAt: Date;
    lastUsedAt: Date | null;
    expiresAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
    deviceName: string | null;
    authMethod: string | null;
    revokedAt: Date | null;
  }): SessionDeviceView {
    return {
      id: t.id,
      createdAt: t.createdAt.toISOString(),
      lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
      expiresAt: t.expiresAt.toISOString(),
      ipAddress: t.ipAddress,
      userAgent: t.userAgent,
      deviceName: t.deviceName,
      authMethod: t.authMethod,
      revoked: t.revokedAt !== null,
    };
  }
}
