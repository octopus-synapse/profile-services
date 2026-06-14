import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

export interface ConnectedAccountView {
  provider: string;
  connectedAt: Date;
}

/** Reads/mutates the user's linked OAuth `Account` rows (no tokens exposed). */
export class ConnectedAccountsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByUser(userId: string): Promise<ConnectedAccountView[]> {
    const rows = await this.prisma.account.findMany({
      where: { userId },
      select: { provider: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => ({ provider: r.provider, connectedAt: r.createdAt }));
  }

  async countByUser(userId: string): Promise<number> {
    return this.prisma.account.count({ where: { userId } });
  }

  async hasPassword(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    return Boolean(user?.passwordHash);
  }

  /** Returns how many rows were removed (0 = provider wasn't linked). */
  async deleteByProvider(userId: string, provider: string): Promise<number> {
    const result = await this.prisma.account.deleteMany({ where: { userId, provider } });
    return result.count;
  }
}
