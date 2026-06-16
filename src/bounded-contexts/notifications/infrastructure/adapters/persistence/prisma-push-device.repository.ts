import { DevicePlatform } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';

/** Stores the Expo push tokens a user's devices register, used to fan out
 *  push notifications. One row per token (re-registering refreshes ownership). */
export class PrismaPushDeviceRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {}

  async upsert(userId: string, expoPushToken: string, platform: DevicePlatform): Promise<void> {
    await this.prisma.pushDevice.upsert({
      where: { expoPushToken },
      create: { userId, expoPushToken, platform, lastSeenAt: new Date() },
      update: { userId, platform, lastSeenAt: new Date() },
    });
  }

  async deleteByToken(userId: string, expoPushToken: string): Promise<number> {
    const result = await this.prisma.pushDevice.deleteMany({ where: { userId, expoPushToken } });
    if (result.count === 0) {
      this.logger.debug('No push device row matched for delete', 'PrismaPushDeviceRepository', {
        userId,
      });
    }
    return result.count;
  }

  async listTokensByUser(userId: string): Promise<string[]> {
    const rows = await this.prisma.pushDevice.findMany({
      where: { userId },
      select: { expoPushToken: true },
    });
    return rows.map((r) => r.expoPushToken);
  }
}
