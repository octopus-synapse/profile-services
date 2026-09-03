import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import {
  type TranslationCostEntry,
  TranslationCostLedgerPort,
} from '../../../domain/ports/translation-cost-ledger.port';

export class PrismaTranslationCostLedgerAdapter extends TranslationCostLedgerPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async record(entry: TranslationCostEntry): Promise<void> {
    await this.prisma.translationCostEntry.create({ data: entry });
    this.logger.debug(
      `Recorded ${entry.tokensUsed} tokens (${entry.costUsdMicros} µUSD) for user ${entry.userId}`,
      'PrismaTranslationCostLedgerAdapter',
    );
  }

  async monthToDateUsdMicros(userId: string, now: Date): Promise<bigint> {
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const sum = await this.prisma.translationCostEntry.aggregate({
      where: { userId, createdAt: { gte: monthStart } },
      _sum: { costUsdMicros: true },
    });
    return sum._sum.costUsdMicros ?? 0n;
  }
}
