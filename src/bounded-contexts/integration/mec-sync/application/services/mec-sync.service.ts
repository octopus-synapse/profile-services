/**
 * MEC Sync Orchestrator — drives one full synchronization run.
 *
 * Lifecycle:
 *   1. Acquire the cache-backed sync lock (raises
 *      `MecSyncInProgressException` if another run is in flight).
 *   2. Open a sync-log row in RUNNING state.
 *   3. Download + parse the CSV via `MecCsvParserService`.
 *   4. Bulk-sync institutions then courses, then invalidate caches.
 *   5. Finalize the log + metadata snapshot via the helper.
 *
 * Lock release is in `finally` — we never leak the lock even if the
 * sync explodes.
 */

import { APP_CONFIG, LoggerPort } from '@/shared-kernel';
import { MecSyncInProgressException } from '../../../domain/exceptions';
import {
  MEC_CACHE_KEYS,
  MEC_CACHE_TTL,
  type SyncMetadata,
  type SyncResult,
} from '../../domain/entities/mec-row';
import { MecCachePort } from '../../domain/ports/mec-cache.port';
import {
  MecSyncLogRepositoryPort,
  type SyncLogRow,
} from '../../domain/ports/mec-sync-log.repository.port';
import { DataSyncService } from './data-sync.service';
import { MecCsvParserService, type ParseResult } from './mec-csv-parser.service';
import { SyncHelperService } from './sync-helper.service';

export class MecSyncService {
  private readonly context = 'MecSync';

  constructor(
    private readonly logger: LoggerPort,
    private readonly cache: MecCachePort,
    private readonly csvParser: MecCsvParserService,
    private readonly dataSync: DataSyncService,
    private readonly syncHelper: SyncHelperService,
    private readonly syncLogRepo: MecSyncLogRepositoryPort,
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
      await this.syncHelper.handleSyncError(syncLog.id, error, startTime, triggeredBy);
      throw error;
    } finally {
      await this.cache.releaseLock(MEC_CACHE_KEYS.SYNC_LOCK);
    }
  }

  async getSyncMetadata(): Promise<SyncMetadata | null> {
    return this.cache.get<SyncMetadata>(MEC_CACHE_KEYS.SYNC_METADATA);
  }

  async isSyncRunning(): Promise<boolean> {
    return this.cache.isLocked(MEC_CACHE_KEYS.SYNC_LOCK);
  }

  async getLastSyncLog(): Promise<SyncLogRow | null> {
    return this.syncLogRepo.findLast();
  }

  async getSyncHistory(
    limit: number = APP_CONFIG.SEARCH_AUTOCOMPLETE_LIMIT,
  ): Promise<SyncLogRow[]> {
    return this.syncLogRepo.findHistory(limit);
  }

  private async acquireLock(): Promise<void> {
    const acquired = await this.cache.acquireLock(
      MEC_CACHE_KEYS.SYNC_LOCK,
      MEC_CACHE_TTL.SYNC_LOCK,
    );

    if (!acquired) {
      throw new MecSyncInProgressException();
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
}
