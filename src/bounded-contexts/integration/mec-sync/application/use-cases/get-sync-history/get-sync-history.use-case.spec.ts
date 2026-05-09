import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { MecCsvDownloaderPort } from '../../../domain/ports/mec-csv-downloader.port';
import {
  InMemoryMecCourseRepository,
  InMemoryMecInstitutionRepository,
} from '../../../testing/in-memory-mec.repository';
import { InMemoryMecCache } from '../../../testing/in-memory-mec-cache';
import { InMemoryMecSyncLogRepository } from '../../../testing/in-memory-mec-sync-log.repository';
import { CsvEncodingService } from '../../services/csv-encoding.service';
import { CsvFileCacheService } from '../../services/csv-file-cache.service';
import { CsvRowProcessorService } from '../../services/csv-row-processor.service';
import { DataSyncService } from '../../services/data-sync.service';
import { MecCsvParserService } from '../../services/mec-csv-parser.service';
import { MecSyncService } from '../../services/mec-sync.service';
import { SyncHelperService } from '../../services/sync-helper.service';
import { GetSyncHistoryUseCase } from './get-sync-history.use-case';

class FakeDownloader extends MecCsvDownloaderPort {
  async download(): Promise<Buffer> {
    return Buffer.from('', 'utf8');
  }
}

describe('GetSyncHistoryUseCase', () => {
  it('returns the persisted history newest-first', async () => {
    const cache = new InMemoryMecCache();
    const syncLogRepo = new InMemoryMecSyncLogRepository();
    await syncLogRepo.create({ triggeredBy: 'one' });
    await syncLogRepo.create({ triggeredBy: 'two' });

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
    const orchestrator = new MecSyncService(
      stubLogger,
      cache,
      parser,
      dataSync,
      helper,
      syncLogRepo,
    );

    const useCase = new GetSyncHistoryUseCase(orchestrator);

    const history = await useCase.execute(5);
    expect(history).toHaveLength(2);
    expect(history[0].triggeredBy).toBe('two');
  });
});
