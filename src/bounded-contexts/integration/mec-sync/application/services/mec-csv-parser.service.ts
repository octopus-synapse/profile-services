/**
 * MEC CSV Parser — orchestrates the download → cache → decode → parse
 * pipeline.
 *
 * Resolution order for the CSV bytes:
 *   1. Local cache if still inside `CACHE_VALIDITY_DAYS`.
 *   2. Fresh download via `MecCsvDownloaderPort` (puppeteer adapter).
 *   3. On download failure, fall back to the cached file even if it
 *      expired — better stale than nothing while Cloudflare misbehaves.
 *   4. Otherwise raise `MecCsvDownloadFailedException`.
 */

import { LoggerPort } from '@/shared-kernel';
import { MecCsvDownloadFailedException, MecCsvEmptyException } from '../../../domain/exceptions';
import { MEC_CSV_URL } from '../../constants';
import type {
  NormalizedCourse,
  NormalizedInstitution,
  SyncError,
} from '../../domain/entities/mec-row';
import { MecCsvDownloaderPort } from '../../domain/ports/mec-csv-downloader.port';
import { buildColumnMap, parseCsvLine } from '../parsers/csv-line.parser';
import { CsvEncodingService } from './csv-encoding.service';
import { CsvFileCacheService } from './csv-file-cache.service';
import { CsvRowProcessorService } from './csv-row-processor.service';

export interface ParseResult {
  institutions: Map<number, NormalizedInstitution>;
  courses: NormalizedCourse[];
  errors: SyncError[];
  totalRows: number;
  fileSize: number;
}

export class MecCsvParserService {
  private readonly context = 'MecCsvParser';

  constructor(
    private readonly logger: LoggerPort,
    private readonly fileCache: CsvFileCacheService,
    private readonly downloader: MecCsvDownloaderPort,
    private readonly encoding: CsvEncodingService,
    private readonly rowProcessor: CsvRowProcessorService,
  ) {}

  async downloadAndParse(url: string = MEC_CSV_URL): Promise<ParseResult> {
    const buffer = await this.getFileBuffer(url);
    const content = this.encoding.decode(buffer);
    return this.parse(content, buffer.length);
  }

  private async getFileBuffer(url: string): Promise<Buffer> {
    if (this.fileCache.isValid()) {
      return this.fileCache.read();
    }

    try {
      const buffer = await this.downloader.download(url);
      this.fileCache.write(buffer);
      return buffer;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Download failed: ${message}`, this.context);
      if (this.fileCache.exists()) {
        this.logger.log('Falling back to cached file', this.context);
        return this.fileCache.read();
      }
      throw new MecCsvDownloadFailedException(message);
    }
  }

  private parse(content: string, fileSize: number): ParseResult {
    const lines = this.splitIntoLines(content);
    this.validateMinimumLines(lines);

    const header = parseCsvLine(lines[0]);
    const columnMap = buildColumnMap(header);

    this.logger.log(`CSV: ${lines.length - 1} rows, ${header.length} columns`, this.context);

    const { institutions, courses, errors } = this.rowProcessor.processDataRows(lines, columnMap);

    return { institutions, courses, errors, totalRows: lines.length - 1, fileSize };
  }

  private splitIntoLines(content: string): string[] {
    return content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .filter((line) => line.trim());
  }

  private validateMinimumLines(lines: string[]): void {
    if (lines.length < 2) {
      throw new MecCsvEmptyException();
    }
  }
}
