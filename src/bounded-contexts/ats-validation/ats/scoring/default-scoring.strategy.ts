import { Injectable } from '@nestjs/common';
import type { SemanticSectionItem } from '@/shared-kernel/dtos/semantic-sections.dto';

@Injectable()
export class DefaultScoringStrategy {
  score(item: SemanticSectionItem): number {
    if (item.values.length === 0) {
      return 20;
    }

    const nonEmptyValues = item.values.filter((value) => {
      if (typeof value.value === 'string') {
        return value.value.trim().length > 0;
      }

      return value.value !== null && value.value !== undefined;
    }).length;

    const density = nonEmptyValues / item.values.length;
    return Math.round(35 + density * 45);
  }
}
