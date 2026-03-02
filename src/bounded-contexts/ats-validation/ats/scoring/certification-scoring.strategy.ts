import { Injectable } from '@nestjs/common';
import type { SemanticSectionItem } from '@/shared-kernel/dtos/semantic-sections.dto';
import { OrganizationExtractor } from '../extractors';
import type { SemanticScoringStrategy } from './semantic-scoring-strategy.interface';

@Injectable()
export class CertificationScoringStrategy implements SemanticScoringStrategy {
  readonly kind = 'CERTIFICATION' as const;

  constructor(private readonly organizationExtractor: OrganizationExtractor) {}

  score(item: SemanticSectionItem): number {
    let score = 40;

    const title = item.values.find((value) => value.role === 'TITLE')?.value;
    if (typeof title === 'string' && title.trim().length > 0) {
      score += 30;
    }

    if (this.organizationExtractor.extractPrimary(item.values)) {
      score += 20;
    }

    const issueDate = item.values.find((value) => value.role === 'ISSUE_DATE')?.value;
    if (typeof issueDate === 'string' || issueDate instanceof Date) {
      score += 10;
    }

    return Math.min(100, score);
  }
}
