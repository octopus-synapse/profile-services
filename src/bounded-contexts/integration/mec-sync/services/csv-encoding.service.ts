/**
 * CSV Encoding Detector
 * Single Responsibility: Detect and convert CSV file encoding
 */

import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment */
const iconv: {
  decode: (buffer: Buffer, encoding: string) => string;
} = require('iconv-lite');
/* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment */

@Injectable()
export class CsvEncodingService {
  private readonly context = 'CsvEncoding';

  constructor(private readonly logger: AppLoggerService) {}

  /**
   * Detect encoding and convert buffer to UTF-8 string
   */
  decode(buffer: Buffer): string {
    if (this.isValidUtf8(buffer)) {
      this.logger.log('CSV detected as UTF-8', this.context);
      return buffer.toString('utf8');
    }

    this.logger.log('CSV detected as Latin-1, converting to UTF-8', this.context);
    return iconv.decode(buffer, 'latin1');
  }

  private isValidUtf8(buffer: Buffer): boolean {
    try {
      const content = buffer.toString('utf8');
      return !content.includes('\uFFFD'); // No replacement characters
    } catch {
      return false;
    }
  }
}
