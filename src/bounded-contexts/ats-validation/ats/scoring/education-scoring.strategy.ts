import { Injectable } from '@nestjs/common';
import type { SemanticSectionItem } from '@/shared-kernel/dtos/semantic-sections.dto';
import { DateRangeExtractor, OrganizationExtractor } from '../extractors';
import type { SemanticScoringStrategy } from './semantic-scoring-strategy.interface';

@Injectable()
export class EducationScoringStrategy implements SemanticScoringStrategy {
  readonly kind = 'EDUCATION' as const;

  constructor(
    private readonly organizationExtractor: OrganizationExtractor,
    private readonly dateRangeExtractor: DateRangeExtractor,
  ) {}

  score(item: SemanticSectionItem): number {
    let score = 35;

    if (this.organizationExtractor.extractPrimary(item.values)) {
      score += 20;
    }

    const degree = item.values.find((value) => value.role === 'DEGREE')?.value;
    if (typeof degree === 'string' && degree.trim().length > 0) {
      score += 25;
    }

    const dateRange = this.dateRangeExtractor.extract(item.values);
    if (dateRange.startDate) {
      score += 10;
    }

    if (dateRange.endDate || dateRange.isOpenEnded) {
      score += 10;
    }

    return Math.min(100, score);
  }
}
