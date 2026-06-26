import { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { readJsonColumn, toPrismaJson } from '@/shared-kernel/persistence/json-column';
import {
  FitRemapHistoryRepositoryPort,
  type FitRemapSnapshot,
} from '../../../domain/ports/fit-remap-history.repository.port';
import type { FitVector } from '../../../domain/types';

export class PrismaFitRemapHistoryRepository extends FitRemapHistoryRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async append(userId: string, vector: FitVector): Promise<FitRemapSnapshot> {
    const row = await this.prisma.fitRemapHistory.create({
      data: { userId, vectorJson: toPrismaJson(vector) },
    });
    return this.toDomain(row);
  }

  async listByUser(userId: string, limit: number): Promise<readonly FitRemapSnapshot[]> {
    const rows = await this.prisma.fitRemapHistory.findMany({
      where: { userId },
      orderBy: { snapshotAt: 'desc' },
      take: limit,
    });
    return rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: {
    id: string;
    userId: string;
    vectorJson: Prisma.JsonValue;
    snapshotAt: Date;
  }): FitRemapSnapshot {
    return {
      id: row.id,
      userId: row.userId,
      vector: readJsonColumn<FitVector>(row.vectorJson),
      snapshotAt: row.snapshotAt,
    };
  }
}
