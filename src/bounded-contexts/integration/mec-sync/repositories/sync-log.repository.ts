/**
 * Sync Log Repository
 * Single Responsibility: Data access for sync logs
 */

import { Injectable } from '@nestjs/common';
import { MecSyncStatus } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

export interface CreateSyncLogParams {
  triggeredBy: string;
}

export interface CompleteSyncLogParams {
  institutionsInserted: number;
  institutionsUpdated: number;
  coursesInserted: number;
  coursesUpdated: number;
  totalRowsProcessed: number;
  sourceFileSize: number;
}

export interface FailSyncLogParams {
  errorMessage: string;
  errorDetails?: Record<string, unknown>;
}

@Injectable()
export class SyncLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: CreateSyncLogParams) {
    return this.prisma.mecSyncLog.create({
      data: {
        status: MecSyncStatus.RUNNING,
        triggeredBy: params.triggeredBy,
      },
    });
  }

  async markSuccess(id: string, params: CompleteSyncLogParams) {
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

  async markFailed(id: string, params: FailSyncLogParams) {
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

  async findLast() {
    return this.prisma.mecSyncLog.findFirst({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findHistory(limit = 10) {
    return this.prisma.mecSyncLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
