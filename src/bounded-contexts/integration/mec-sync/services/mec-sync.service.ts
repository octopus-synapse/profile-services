/**
 * MEC Sync Orchestrator Service
 * Single Responsibility: Orchestrate the synchronization workflow
 * Delegates data operations to specialized services
 */

import { Injectable } from '@nestjs/common';
import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { APP_CONFIG } from '@/shared-kernel';
import {
  MEC_CACHE_KEYS,
  MEC_CACHE_TTL,
  SyncMetadata,
  SyncResult,
} from '../interfaces/mec-data.interface';
import { SyncLogRepository } from '../repositories';
import { DataSyncService } from './data-sync.service';
import { MecCsvParserService, ParseResult } from './mec-csv-parser.service';
import { SyncHelperService } from './sync-helper.service';

@Injectable()
export class MecSyncOrchestratorService {
  private readonly context = 'MecSync';

  constructor(
    private readonly cache: CacheService,
    private readonly logger: AppLoggerService,
    private readonly csvParser: MecCsvParserService,
    private readonly dataSync: DataSyncService,
    private readonly syncHelper: SyncHelperService,
    private readonly syncLogRepo: SyncLogRepository,
  ) {}

  async sync(triggeredBy: string = 'manual'): Promise<SyncResult> {
    const startTime = Date.now();
    await this.acquireLock();

    const syncLog = await this.syncLogRepo.create({ triggeredBy });

    try {
      this.logger.log(`Starting MEC sync (id: ${syncLog.id})`, this.context);

      const parseResult = await this.csvParser.downloadAndParse();
      const syncResult = await this.performSync(parseResult);

      await this.syncHelper.finalizeSyncSuccess(
        syncLog.id,
        {
          ...syncResult,
          totalRowsProcessed: parseResult.totalRows,
          sourceFileSize: parseResult.fileSize,
          institutionCount: parseResult.institutions.size,
          courseCount: parseResult.courses.length,
        },
        startTime,
        triggeredBy,
      );

      this.syncHelper.logSyncCompletion(
        syncResult.institutionsInserted,
        syncResult.coursesInserted,
        startTime,
      );

      return syncResult;
    } catch (error) {
      // External I/O side-effects (DB update) - see ERROR_HANDLING_STRATEGY.md
      await this.syncHelper.handleSyncError(syncLog.id, error, startTime, triggeredBy);
      throw error;
    } finally {
      await this.cache.releaseLock(MEC_CACHE_KEYS.SYNC_LOCK);
    }
  }

  private async acquireLock(): Promise<void> {
    const lockAcquired = await this.cache.acquireLock(
      MEC_CACHE_KEYS.SYNC_LOCK,
      MEC_CACHE_TTL.SYNC_LOCK,
    );

    if (!lockAcquired) {
      throw new Error('Sync already in progress. Please wait for the current sync to complete.');
    }
  }

  private async performSync(parseResult: ParseResult): Promise<SyncResult> {
    const institutionResult = await this.dataSync.syncInstitutions(parseResult);
    const courseResult = await this.dataSync.syncCourses(parseResult);

    await this.dataSync.invalidateCaches();

    return {
      institutionsInserted: institutionResult.inserted,
      institutionsUpdated: institutionResult.updated,
      coursesInserted: courseResult.inserted,
      coursesUpdated: courseResult.updated,
      totalRowsProcessed: parseResult.totalRows,
      errors: parseResult.errors,
    };
  }

  // Status methods
  async getSyncMetadata(): Promise<SyncMetadata | null> {
    return this.cache.get<SyncMetadata>(MEC_CACHE_KEYS.SYNC_METADATA);
  }

  async isSyncRunning(): Promise<boolean> {
    return this.cache.isLocked(MEC_CACHE_KEYS.SYNC_LOCK);
  }

  async getLastSyncLog() {
    return this.syncLogRepo.findLast();
  }

  async getSyncHistory(limit: number = APP_CONFIG.SEARCH_AUTOCOMPLETE_LIMIT) {
    return this.syncLogRepo.findHistory(limit);
  }
}
