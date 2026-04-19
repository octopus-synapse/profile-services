/**
 * CSV Encoding Detector
 * Single Responsibility: Detect and convert CSV file encoding
 */

import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';

@Injectable()
export class CsvEncodingService {
  private readonly context = 'CsvEncoding';

  constructor(private readonly logger: AppLoggerService) {}

  decode(buffer: Buffer): string {
    if (this.isValidUtf8(buffer)) {
      this.logger.log('CSV detected as UTF-8', this.context);
      return buffer.toString('utf8');
    }

    this.logger.log('CSV detected as Latin-1, converting to UTF-8', this.context);
    return buffer.toString('latin1');
  }

  private isValidUtf8(buffer: Buffer): boolean {
    try {
      const content = buffer.toString('utf8');
      return !content.includes('\uFFFD');
    } catch {
      return false;
    }
  }
}
