/**
 * CSV File Cache — local on-disk cache of the last successful CSV
 * download. Sits between the downloader port and the parser so we can
 * survive transient Cloudflare blocks (the parser falls back to the
 * cached file when a download fails) and avoid re-downloading the full
 * MEC dataset on every sync within `CACHE_VALIDITY_DAYS`.
 *
 * Filesystem I/O is intentionally synchronous — this runs on the sync
 * worker, not in a request hot path.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { LoggerPort, TIME_MS } from '@/shared-kernel';
import { CACHE_VALIDITY_DAYS, LOCAL_CSV_PATH } from '../../constants';

export class CsvFileCacheService {
  private readonly context = 'CsvFileCache';

  constructor(private readonly logger: LoggerPort) {}

  isValid(): boolean {
    if (!fs.existsSync(LOCAL_CSV_PATH)) {
      return false;
    }

    const stats = fs.statSync(LOCAL_CSV_PATH);
    const validityMs = CACHE_VALIDITY_DAYS * TIME_MS.DAY;
    const expirationTime = Date.now() - validityMs;

    return stats.mtimeMs > expirationTime;
  }

  read(): Buffer {
    this.logger.log(`Reading cached CSV: ${LOCAL_CSV_PATH}`, this.context);
    return fs.readFileSync(LOCAL_CSV_PATH);
  }

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
