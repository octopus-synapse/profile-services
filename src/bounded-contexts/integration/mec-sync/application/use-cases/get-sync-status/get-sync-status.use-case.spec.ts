import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { MecCsvDownloaderPort } from '../../../domain/ports/mec-csv-downloader.port';
import { InMemoryMecCache } from '../../../testing/in-memory-mec-cache';
import {
  InMemoryMecCourseRepository,
  InMemoryMecInstitutionRepository,
} from '../../../testing/in-memory-mec-repositories';
import { InMemoryMecSyncLogRepository } from '../../../testing/in-memory-mec-sync-log.repository';
import { CsvEncodingService } from '../../services/csv-encoding.service';
import { CsvFileCacheService } from '../../services/csv-file-cache.service';
import { CsvRowProcessorService } from '../../services/csv-row-processor.service';
import { DataSyncService } from '../../services/data-sync.service';
import { MecCsvParserService } from '../../services/mec-csv-parser.service';
import { MecSyncService } from '../../services/mec-sync.service';
import { SyncHelperService } from '../../services/sync-helper.service';
import { GetSyncStatusUseCase } from './get-sync-status.use-case';

class FakeDownloader extends MecCsvDownloaderPort {
  async download(): Promise<Buffer> {
    return Buffer.from('', 'utf8');
  }
}

function buildOrchestrator() {
  const cache = new InMemoryMecCache();
  const syncLogRepo = new InMemoryMecSyncLogRepository();
  const parser = new MecCsvParserService(
    stubLogger,
    new CsvFileCacheService(stubLogger),
    new FakeDownloader(),
    new CsvEncodingService(stubLogger),
    new CsvRowProcessorService(stubLogger),
  );
  const dataSync = new DataSyncService(
    stubLogger,
    cache,
    new InMemoryMecInstitutionRepository(),
    new InMemoryMecCourseRepository(),
  );
  const helper = new SyncHelperService(stubLogger, cache, syncLogRepo);
  return new MecSyncService(stubLogger, cache, parser, dataSync, helper, syncLogRepo);
}

describe('GetSyncStatusUseCase', () => {
  it('returns isRunning + metadata + lastSync', async () => {
    const useCase = new GetSyncStatusUseCase(buildOrchestrator());

    const result = await useCase.execute();

    expect(result.isRunning).toBe(false);
    expect(result.metadata).toBeNull();
    expect(result.lastSync).toBeNull();
  });
});
