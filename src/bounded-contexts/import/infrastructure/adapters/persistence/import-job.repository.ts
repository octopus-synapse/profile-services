/**
 * Prisma Import Job Repository
 *
 * Infrastructure adapter implementing ImportJobRepositoryPort using Prisma.
 */

import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { ImportJobRepositoryPort } from '../../../domain/ports/import-job.repository.port';
import type {
  CreateImportJobParams,
  ImportJobData,
  ImportStatus,
} from '../../../domain/types/import.types';

@Injectable()
export class PrismaImportJobRepository implements ImportJobRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: CreateImportJobParams): Promise<ImportJobData> {
    const record = await this.prisma.resumeImport.create({
      data: {
        userId: params.userId,
        source: params.source,
        status: 'PENDING',
        rawData: params.rawData as Prisma.InputJsonValue,
        fileName: params.fileName,
      },
    });
    return this.toDomain(record);
  }

  async findById(id: string): Promise<ImportJobData | null> {
    const record = await this.prisma.resumeImport.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findByUserId(userId: string): Promise<ImportJobData[]> {
    const records = await this.prisma.resumeImport.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async updateStatus(
    id: string,
    status: ImportStatus,
    errorMessage?: string | null,
    resumeId?: string,
  ): Promise<ImportJobData> {
    const record = await this.prisma.resumeImport.update({
      where: { id },
      data: {
        status,
        errorMessage: errorMessage ?? null,
        resumeId,
        completedAt: status === 'COMPLETED' || status === 'FAILED' ? new Date() : undefined,
      },
    });
    return this.toDomain(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.resumeImport.delete({ where: { id } });
  }

  private toDomain(record: {
    id: string;
    userId: string;
    source: string;
    status: string;
    fileUrl: string | null;
    fileName: string | null;
    rawData: unknown;
    mappedData: unknown;
    errors: unknown;
    errorMessage: string | null;
    resumeId: string | null;
    metadata: unknown;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
  }): ImportJobData {
    return {
      id: record.id,
      userId: record.userId,
      source: record.source as ImportJobData['source'],
      status: record.status as ImportJobData['status'],
      fileUrl: record.fileUrl,
      fileName: record.fileName,
      rawData: record.rawData,
      mappedData: record.mappedData,
      errors: Array.isArray(record.errors) ? (record.errors as string[]) : [],
      errorMessage: record.errorMessage,
      resumeId: record.resumeId,
      metadata: record.metadata as Record<string, unknown> | null,
      startedAt: record.startedAt,
      completedAt: record.completedAt,
      createdAt: record.createdAt,
    };
  }
}
