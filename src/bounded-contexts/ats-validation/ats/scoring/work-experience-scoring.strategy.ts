import { Injectable } from '@nestjs/common';
import type { SemanticSectionItem } from '@/shared-kernel/dtos/semantic-sections.dto';
import { DateRangeExtractor, JobTitleExtractor, OrganizationExtractor } from '../extractors';
import type { SemanticScoringStrategy } from './semantic-scoring-strategy.interface';

@Injectable()
export class WorkExperienceScoringStrategy implements SemanticScoringStrategy {
  readonly kind = 'WORK_EXPERIENCE' as const;

  constructor(
    private readonly organizationExtractor: OrganizationExtractor,
    private readonly jobTitleExtractor: JobTitleExtractor,
    private readonly dateRangeExtractor: DateRangeExtractor,
  ) {}

  score(item: SemanticSectionItem): number {
    let score = 30;

    if (this.organizationExtractor.extractPrimary(item.values)) {
      score += 20;
    }

    if (this.jobTitleExtractor.extractPrimary(item.values)) {
      score += 20;
    }

    const dateRange = this.dateRangeExtractor.extract(item.values);
    if (dateRange.startDate) {
      score += 15;
    }

    if (dateRange.endDate || dateRange.isOpenEnded) {
      score += 10;
    }

    const description = item.values.find((value) => value.role === 'DESCRIPTION')?.value;
    if (typeof description === 'string' && description.trim().length >= 30) {
      score += 5;
    }

    return Math.min(100, score);
  }
}
