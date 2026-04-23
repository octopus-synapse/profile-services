import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  FitRemapHistoryRepositoryPort,
  type FitRemapSnapshot,
} from '../../../domain/ports/fit-remap-history.repository.port';
import type { FitVector } from '../../../domain/types';

@Injectable()
export class PrismaFitRemapHistoryRepository extends FitRemapHistoryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async append(userId: string, vector: FitVector): Promise<FitRemapSnapshot> {
    const row = await this.prisma.fitRemapHistory.create({
      data: {
        userId,
        vectorJson: vector as unknown as Prisma.InputJsonValue,
      },
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
      vector: row.vectorJson as unknown as FitVector,
      snapshotAt: row.snapshotAt,
    };
  }
}
