import { Injectable } from '@nestjs/common';
import type { SemanticFieldValue } from '@/shared-kernel/dtos/semantic-sections.dto';

@Injectable()
export class OrganizationExtractor {
  extractPrimary(values: SemanticFieldValue[]): string | undefined {
    const value = values.find((entry) => entry.role === 'ORGANIZATION')?.value;

    if (typeof value !== 'string') {
      return undefined;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  }
}
