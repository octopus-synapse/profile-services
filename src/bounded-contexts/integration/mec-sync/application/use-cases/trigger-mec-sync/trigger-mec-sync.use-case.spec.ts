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
import { TriggerMecSyncUseCase } from './trigger-mec-sync.use-case';

const HEADER =
  'CO_IES,NO_IES,SG_IES,TP_ORGANIZACAO,TP_CATEGORIA,CO_MUNICIPIO_IES,NO_MUNICIPIO_IES,SG_UF_IES,CO_CURSO,NO_CURSO,TP_GRAU,TP_MODALIDADE,NO_CINE_AREA_GERAL,QT_CARGA_HORARIA,CO_SITUACAO';

const ROW =
  '1,Universidade Federal,UFRJ,1,1,3304557,Rio de Janeiro,RJ,116815,Computação,1,1,Computação,3200,1';

class FakeDownloader extends MecCsvDownloaderPort {
  async download(): Promise<Buffer> {
    return Buffer.from(`${HEADER}\n${ROW}\n`, 'utf8');
  }
}

class FakeFileCache extends CsvFileCacheService {
  constructor() {
    super(stubLogger);
  }
  isValid(): boolean {
    return false;
  }
  exists(): boolean {
    return false;
  }
  read(): Buffer {
    throw new Error('not used');
  }
  write(_buf: Buffer): void {
    /* noop */
  }
}

describe('TriggerMecSyncUseCase', () => {
  it('runs the orchestrator end-to-end', async () => {
    const cache = new InMemoryMecCache();
    const institutionRepo = new InMemoryMecInstitutionRepository();
    const courseRepo = new InMemoryMecCourseRepository();
    const syncLogRepo = new InMemoryMecSyncLogRepository();
    const parser = new MecCsvParserService(
      stubLogger,
      new FakeFileCache(),
      new FakeDownloader(),
      new CsvEncodingService(stubLogger),
      new CsvRowProcessorService(stubLogger),
    );
    const dataSync = new DataSyncService(stubLogger, cache, institutionRepo, courseRepo);
    const helper = new SyncHelperService(stubLogger, cache, syncLogRepo);
    const orchestrator = new MecSyncService(
      stubLogger,
      cache,
      parser,
      dataSync,
      helper,
      syncLogRepo,
    );

    const useCase = new TriggerMecSyncUseCase(orchestrator);
    const result = await useCase.execute('test');

    expect(result.institutionsInserted).toBe(1);
    expect(result.coursesInserted).toBe(1);
  });
});
