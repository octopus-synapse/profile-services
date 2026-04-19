import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

@Injectable()
export class UiStateService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(userId: string): Promise<Record<string, unknown>> {
    const rows = await this.prisma.userUiState.findMany({
      where: { userId },
      select: { key: true, value: true },
    });
    const out: Record<string, unknown> = {};
    for (const r of rows) out[r.key] = r.value;
    return out;
  }

  async setKey(
    userId: string,
    key: string,
    value: unknown,
  ): Promise<{ key: string; value: unknown }> {
    const safeValue = (value ?? null) as object;
    const row = await this.prisma.userUiState.upsert({
      where: { userId_key: { userId, key } },
      create: { userId, key, value: safeValue },
      update: { value: safeValue },
    });
    return { key: row.key, value: row.value };
  }

  async deleteKey(userId: string, key: string): Promise<void> {
    await this.prisma.userUiState
      .delete({ where: { userId_key: { userId, key } } })
      .catch(() => undefined);
  }
}
