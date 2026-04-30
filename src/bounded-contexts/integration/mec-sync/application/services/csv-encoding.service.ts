/**
 * CSV Encoding Service — pure helper that picks UTF-8 vs Latin-1 for
 * the downloaded MEC CSV.
 *
 * `Buffer.toString('utf8')` never throws; it substitutes invalid
 * sequences with U+FFFD, which is exactly the signal we use to fall
 * back to Latin-1 (the historical encoding of the MEC dataset).
 */

import { LoggerPort } from '@/shared-kernel';

export class CsvEncodingService {
  private readonly context = 'CsvEncoding';

  constructor(private readonly logger: LoggerPort) {}

  decode(buffer: Buffer): string {
    if (this.isValidUtf8(buffer)) {
      this.logger.log('CSV detected as UTF-8', this.context);
      return buffer.toString('utf8');
    }

    this.logger.log('CSV detected as Latin-1, converting to UTF-8', this.context);
    return buffer.toString('latin1');
  }

  private isValidUtf8(buffer: Buffer): boolean {
    return !buffer.toString('utf8').includes('�');
  }
}
