import { Injectable } from '@nestjs/common';
import type { SemanticFieldValue } from '@/shared-kernel/dtos/semantic-sections.dto';

@Injectable()
export class JobTitleExtractor {
  extractPrimary(values: SemanticFieldValue[]): string | undefined {
    const preferred = values.find((entry) => entry.role === 'JOB_TITLE')?.value;
    if (typeof preferred === 'string' && preferred.trim().length > 0) {
      return preferred.trim();
    }

    const fallback = values.find((entry) => entry.role === 'TITLE')?.value;
    if (typeof fallback === 'string' && fallback.trim().length > 0) {
      return fallback.trim();
    }

    return undefined;
  }
}
