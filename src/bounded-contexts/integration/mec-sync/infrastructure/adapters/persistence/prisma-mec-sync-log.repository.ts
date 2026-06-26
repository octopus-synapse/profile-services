/**
 * Prisma adapter for `MecSyncLogRepositoryPort`. Maps the BC's
 * status strings (`SUCCESS` / `FAILED` / `RUNNING`) onto the
 * `MecSyncStatus` Prisma enum.
 */

import { MecSyncStatus } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';

import {
  type CompleteSyncLogParams,
  type CreateSyncLogParams,
  type FailSyncLogParams,
  MecSyncLogRepositoryPort,
  type SyncLogRow,
} from '../../../domain/ports/mec-sync-log.repository.port';

export class PrismaMecSyncLogRepository extends MecSyncLogRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async create(params: CreateSyncLogParams): Promise<SyncLogRow> {
    return this.prisma.mecSyncLog.create({
      data: { status: MecSyncStatus.RUNNING, triggeredBy: params.triggeredBy },
    });
  }

  async markSuccess(id: string, params: CompleteSyncLogParams): Promise<SyncLogRow> {
    return this.prisma.mecSyncLog.update({
      where: { id },
      data: {
        status: MecSyncStatus.SUCCESS,
        completedAt: new Date(),
        institutionsInserted: params.institutionsInserted,
        institutionsUpdated: params.institutionsUpdated,
        coursesInserted: params.coursesInserted,
        coursesUpdated: params.coursesUpdated,
        totalRowsProcessed: params.totalRowsProcessed,
        sourceFileSize: params.sourceFileSize,
      },
    });
  }

  async markFailed(id: string, params: FailSyncLogParams): Promise<SyncLogRow> {
    return this.prisma.mecSyncLog.update({
      where: { id },
      data: {
        status: MecSyncStatus.FAILED,
        completedAt: new Date(),
        errorMessage: params.errorMessage,
        errorDetails: params.errorDetails as object | undefined,
      },
    });
  }

  async findLast(): Promise<SyncLogRow | null> {
    return this.prisma.mecSyncLog.findFirst({ orderBy: { createdAt: 'desc' } });
  }

  async findHistory(limit: number): Promise<SyncLogRow[]> {
    return this.prisma.mecSyncLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
