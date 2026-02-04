/**
 * MEC Sync Helper Service
 * Handles sync finalization, error handling, and metadata updates
 */

import { Injectable } from '@nestjs/common';
import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { SyncLogRepository } from '../repositories';
import {
  SyncMetadata,
  MEC_CACHE_KEYS,
  MEC_CACHE_TTL,
} from '../interfaces/mec-data.interface';

@Injectable()
export class SyncHelperService {
  private readonly context = 'MecSync';

  constructor(
    private readonly cache: CacheService,
    private readonly logger: AppLoggerService,
    private readonly syncLogRepo: SyncLogRepository,
  ) {}

  async finalizeSyncSuccess(
    syncLogId: string,
    stats: SyncSuccessStats,
    startTime: number,
    triggeredBy: string,
  ): Promise<void> {
    const duration = Date.now() - startTime;

    await this.syncLogRepo.markSuccess(syncLogId, {
      institutionsInserted: stats.institutionsInserted,
      institutionsUpdated: stats.institutionsUpdated,
      coursesInserted: stats.coursesInserted,
      coursesUpdated: stats.coursesUpdated,
      totalRowsProcessed: stats.totalRowsProcessed,
      sourceFileSize: stats.sourceFileSize,
    });

    await this.updateSyncMetadata({
      lastSyncAt: new Date().toISOString(),
      lastSyncStatus: 'success',
      lastSyncDuration: duration,
      totalInstitutions: stats.institutionCount,
      totalCourses: stats.courseCount,
      triggeredBy,
    });
  }

  async handleSyncError(
    syncLogId: string,
    error: unknown,
    startTime: number,
    triggeredBy: string,
  ): Promise<void> {
    const errorMessage = this.extractErrorMessage(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    await this.syncLogRepo.markFailed(syncLogId, {
      errorMessage,
      errorDetails: errorStack ? { stack: errorStack } : undefined,
    });

    await this.updateSyncMetadata({
      lastSyncAt: new Date().toISOString(),
      lastSyncStatus: 'failed',
      lastSyncDuration: Date.now() - startTime,
      totalInstitutions: 0,
      totalCourses: 0,
      triggeredBy,
    });

    this.logger.error('MEC sync failed', errorStack, this.context);
  }

  async updateSyncMetadata(metadata: SyncMetadata): Promise<void> {
    await this.cache.set(
      MEC_CACHE_KEYS.SYNC_METADATA,
      metadata,
      MEC_CACHE_TTL.METADATA,
    );
  }

  logSyncCompletion(
    institutionsInserted: number,
    coursesInserted: number,
    startTime: number,
  ): void {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    this.logger.log(
      `MEC sync completed in ${duration}s: ${institutionsInserted} new institutions, ${coursesInserted} new courses`,
      this.context,
    );
  }

  private extractErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}

export interface SyncSuccessStats {
  institutionsInserted: number;
  institutionsUpdated: number;
  coursesInserted: number;
  coursesUpdated: number;
  totalRowsProcessed: number;
  sourceFileSize: number;
  institutionCount: number;
  courseCount: number;
}
