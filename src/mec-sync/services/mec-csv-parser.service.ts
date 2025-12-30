/**
 * CSV Parser Service
 * Orchestrates the CSV parsing pipeline
 */

import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '../../common/logger/logger.service';
import { CsvFileCacheService } from './csv-file-cache.service';
import { CsvDownloaderService } from './csv-downloader.service';
import { CsvEncodingService } from './csv-encoding.service';
import { CsvRowProcessorService } from './csv-row-processor.service';
import {
  NormalizedInstitution,
  NormalizedCourse,
  SyncError,
} from '../interfaces/mec-data.interface';
import { MEC_CSV_URL } from '../constants';
import { parseCsvLine, buildColumnMap } from '../parsers/csv-line.parser';

export interface ParseResult {
  institutions: Map<number, NormalizedInstitution>;
  courses: NormalizedCourse[];
  errors: SyncError[];
  totalRows: number;
  fileSize: number;
}

@Injectable()
export class MecCsvParserService {
  private readonly context = 'MecCsvParser';

  constructor(
    private readonly logger: AppLoggerService,
    private readonly fileCache: CsvFileCacheService,
    private readonly downloader: CsvDownloaderService,
    private readonly encoding: CsvEncodingService,
    private readonly rowProcessor: CsvRowProcessorService,
  ) {}

  /**
   * Download and parse the MEC CSV file
   */
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
      return this.handleDownloadError(error);
    }
  }

  private handleDownloadError(error: unknown): Buffer {
    const message = error instanceof Error ? error.message : 'Unknown error';
    this.logger.warn(`Download failed: ${message}`, this.context);

    if (this.fileCache.exists()) {
      this.logger.log('Falling back to cached file', this.context);
      return this.fileCache.read();
    }

    throw new Error(`MEC CSV download failed: ${message}. No cache available.`);
  }

  private parse(content: string, fileSize: number): ParseResult {
    const lines = this.splitIntoLines(content);
    this.validateMinimumLines(lines);

    const header = parseCsvLine(lines[0]);
    const columnMap = buildColumnMap(header);

    this.logger.log(
      `CSV: ${lines.length - 1} rows, ${header.length} columns`,
      this.context,
    );

    const { institutions, courses, errors } = this.rowProcessor.processDataRows(
      lines,
      columnMap,
    );

    return {
      institutions,
      courses,
      errors,
      totalRows: lines.length - 1,
      fileSize,
    };
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
      throw new Error('CSV file is empty or has no data rows');
    }
  }
}
