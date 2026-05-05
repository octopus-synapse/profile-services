/**
 * Prisma adapter for `UploadOwnershipPort` (P0-005). Reads/writes the
 * `Upload` table.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { UploadOwnershipPort } from '../../../application/ports/upload-ownership.port';

export class PrismaUploadOwnershipRepository extends UploadOwnershipPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findOwner(key: string): Promise<string | null> {
    const row = await this.prisma.upload.findUnique({
      where: { key },
      select: { userId: true },
    });
    return row?.userId ?? null;
  }

  async record(record: {
    key: string;
    userId: string;
    contentType?: string;
    sizeBytes?: number;
  }): Promise<void> {
    await this.prisma.upload.create({
      data: {
        key: record.key,
        userId: record.userId,
        contentType: record.contentType,
        sizeBytes: record.sizeBytes,
      },
    });
  }

  async recordIfMissing(record: { key: string; userId: string }): Promise<void> {
    await this.prisma.upload.upsert({
      where: { key: record.key },
      create: { key: record.key, userId: record.userId },
      update: {}, // idempotent: leave existing row alone
    });
  }
}
