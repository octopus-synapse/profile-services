import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { MecCsvDownloaderPort } from '../../domain/ports/mec-csv-downloader.port';
import { CsvEncodingService } from './csv-encoding.service';
import { CsvFileCacheService } from './csv-file-cache.service';
import { CsvRowProcessorService } from './csv-row-processor.service';
import { MecCsvParserService } from './mec-csv-parser.service';

class FakeDownloader extends MecCsvDownloaderPort {
  constructor(private readonly buffer: Buffer) {
    super();
  }
  async download(): Promise<Buffer> {
    return this.buffer;
  }
}

class FakeFileCache extends CsvFileCacheService {
  constructor() {
    super(stubLogger);
  }
  override isValid(): boolean {
    return false;
  }
  override exists(): boolean {
    return false;
  }
  override read(): Buffer {
    throw new Error('not used');
  }
  override write(_buf: Buffer): void {
    /* noop */
  }
}

const HEADER =
  'CO_IES,NO_IES,SG_IES,TP_ORGANIZACAO,TP_CATEGORIA,CO_MUNICIPIO_IES,NO_MUNICIPIO_IES,SG_UF_IES,CO_CURSO,NO_CURSO,TP_GRAU,TP_MODALIDADE,NO_CINE_AREA_GERAL,QT_CARGA_HORARIA,CO_SITUACAO';

const ROW =
  '1,Universidade Federal,UFRJ,1,1,3304557,Rio de Janeiro,RJ,116815,Computação,1,1,Computação,3200,1';

describe('MecCsvParserService', () => {
  it('downloads, decodes and parses the CSV into entities', async () => {
    const buffer = Buffer.from(`${HEADER}\n${ROW}\n`, 'utf8');
    const parser = new MecCsvParserService(
      stubLogger,
      new FakeFileCache(),
      new FakeDownloader(buffer),
      new CsvEncodingService(stubLogger),
      new CsvRowProcessorService(stubLogger),
    );

    const result = await parser.downloadAndParse('https://example.test/mec.csv');

    expect(result.totalRows).toBe(1);
    expect(result.institutions.size).toBe(1);
    expect(result.courses).toHaveLength(1);
  });
});
