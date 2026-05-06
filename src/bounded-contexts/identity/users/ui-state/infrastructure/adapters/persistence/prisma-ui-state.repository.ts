import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import {
  type UiStateEntry,
  UiStateRepositoryPort,
} from '../../../application/ports/ui-state-repository.port';

export class PrismaUiStateRepository extends UiStateRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger?: LoggerPort,
  ) {
    super();
  }

  async list(userId: string): Promise<UiStateEntry[]> {
    const rows = await this.prisma.userUiState.findMany({
      where: { userId },
      select: { key: true, value: true },
    });
    return rows.map((r) => ({ key: r.key, value: r.value }));
  }

  async find(userId: string, key: string): Promise<UiStateEntry | null> {
    const row = await this.prisma.userUiState.findUnique({
      where: { userId_key: { userId, key } },
      select: { key: true, value: true },
    });
    return row ? { key: row.key, value: row.value } : null;
  }

  async upsert(userId: string, entry: UiStateEntry): Promise<UiStateEntry> {
    const safeValue = (entry.value ?? null) as object;
    const row = await this.prisma.userUiState.upsert({
      where: { userId_key: { userId, key: entry.key } },
      create: { userId, key: entry.key, value: safeValue },
      update: { value: safeValue },
    });
    return { key: row.key, value: row.value };
  }

  async delete(userId: string, key: string): Promise<void> {
    try {
      await this.prisma.userUiState.delete({ where: { userId_key: { userId, key } } });
    } catch (err) {
      if (this.logger) {
        this.logger.debug(
          `Idempotent UI-state delete: row ${userId}/${key} did not exist`,
          'PrismaUiStateRepository',
          { reason: err instanceof Error ? err.message : String(err) },
        );
      }
    }
  }
}
