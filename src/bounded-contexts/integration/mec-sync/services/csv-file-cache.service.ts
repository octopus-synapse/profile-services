/**
 * CSV File Cache Service
 * Single Responsibility: Manage local CSV file caching
 */

import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { TIME_MS } from '@/shared-kernel';
import * as fs from 'fs';
import * as path from 'path';
import { LOCAL_CSV_PATH, CACHE_VALIDITY_DAYS } from '../constants';

@Injectable()
export class CsvFileCacheService {
  private readonly logger: AppLoggerService;
  private readonly context = 'CsvFileCache';

  constructor(logger: AppLoggerService) {
    this.logger = logger;
  }

  /**
   * Check if cached file exists and is still valid
   */
  isValid(): boolean {
    if (!fs.existsSync(LOCAL_CSV_PATH)) {
      return false;
    }

    const stats = fs.statSync(LOCAL_CSV_PATH);
    const validityMs = CACHE_VALIDITY_DAYS * TIME_MS.DAY;
    const expirationTime = Date.now() - validityMs;

    return stats.mtimeMs > expirationTime;
  }

  /**
   * Read cached CSV file
   */
  read(): Buffer {
    this.logger.log(`Reading cached CSV: ${LOCAL_CSV_PATH}`, this.context);
    return fs.readFileSync(LOCAL_CSV_PATH);
  }

  /**
   * Write buffer to cache
   */
  write(buffer: Buffer): void {
    try {
      this.ensureDirectoryExists();
      fs.writeFileSync(LOCAL_CSV_PATH, buffer);
      this.logger.log(`Cached CSV to: ${LOCAL_CSV_PATH}`, this.context);
    } catch (error) {
      this.logger.warn(
        `Failed to cache CSV: ${error instanceof Error ? error.message : 'Unknown'}`,
        this.context,
      );
    }
  }

  /**
   * Check if cache file exists (even if expired)
   */
  exists(): boolean {
    return fs.existsSync(LOCAL_CSV_PATH);
  }

  private ensureDirectoryExists(): void {
    const dir = path.dirname(LOCAL_CSV_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
