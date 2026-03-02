import { Injectable } from '@nestjs/common';
import type { SectionKind } from '@/shared-kernel/dtos/semantic-sections.dto';
import type { SemanticResumeSnapshot } from '../interfaces';
import {
  type ValidationIssue,
  type ValidationResult,
  ValidationSeverity,
} from '../interfaces/validation-result.interface';
import type { SemanticPolicy } from './semantic-policy.interface';

@Injectable()
export class SectionOrderSemanticPolicy implements SemanticPolicy {
  private readonly recommendedOrder: SectionKind[] = [
    'PERSONAL_INFO',
    'SUMMARY',
    'WORK_EXPERIENCE',
    'EDUCATION',
    'SKILL_SET',
    'CERTIFICATION',
    'PROJECT',
    'AWARD',
    'PUBLICATION',
    'LANGUAGE',
    'INTEREST',
    'RECOMMENDATION',
  ];

  validate(snapshot: SemanticResumeSnapshot): ValidationResult {
    const issues: ValidationIssue[] = [];
    const currentOrder = this.uniqueOrder(snapshot);

    this.checkExperienceBeforeEducation(currentOrder, issues);
    this.checkSummaryNearTop(currentOrder, issues);

    return {
      passed: issues.every((issue) => issue.severity !== ValidationSeverity.ERROR),
      issues,
      metadata: {
        currentOrder,
        recommendedOrder: this.recommendedOrder,
      },
    };
  }

  private uniqueOrder(snapshot: SemanticResumeSnapshot): SectionKind[] {
    const seen = new Set<SectionKind>();
    const order: SectionKind[] = [];

    for (const item of snapshot.items) {
      if (seen.has(item.sectionKind)) {
        continue;
      }
      seen.add(item.sectionKind);
      order.push(item.sectionKind);
    }

    return order;
  }

  private checkExperienceBeforeEducation(order: SectionKind[], issues: ValidationIssue[]): void {
    const experienceIndex = order.indexOf('WORK_EXPERIENCE');
    const educationIndex = order.indexOf('EDUCATION');

    if (experienceIndex !== -1 && educationIndex !== -1 && experienceIndex > educationIndex) {
      issues.push({
        code: 'WORK_EXPERIENCE_AFTER_EDUCATION',
        message: 'WORK_EXPERIENCE should usually appear before EDUCATION',
        severity: ValidationSeverity.INFO,
        suggestion: 'Move work experience section above education for ATS readability',
      });
    }
  }

  private checkSummaryNearTop(order: SectionKind[], issues: ValidationIssue[]): void {
    const summaryIndex = order.indexOf('SUMMARY');

    if (summaryIndex > 2) {
      issues.push({
        code: 'SUMMARY_TOO_LATE_SEMANTIC',
        message: 'SUMMARY should appear near the top of the resume',
        severity: ValidationSeverity.INFO,
        suggestion: 'Move summary section to the top, after personal info',
      });
    }
  }
}
