import { Injectable } from '@nestjs/common';
import type { SemanticResumeSnapshot } from '../../interfaces';
import {
  type ValidationIssue,
  type ValidationResult,
  ValidationSeverity,
} from '../../interfaces/validation-result.interface';
import type { SemanticPolicy } from './semantic-policy.interface';

@Injectable()
export class DuplicateSemanticPolicy implements SemanticPolicy {
  validate(snapshot: SemanticResumeSnapshot): ValidationResult {
    const issues: ValidationIssue[] = [];
    const counts = new Map<string, number>();

    for (const item of snapshot.items) {
      counts.set(item.sectionTypeKey, (counts.get(item.sectionTypeKey) ?? 0) + 1);
    }

    for (const [sectionTypeKey, count] of counts.entries()) {
      if (count <= 1) {
        continue;
      }

      issues.push({
        code: 'DUPLICATE_SEMANTIC_SECTION_TYPE',
        message: `Section type ${sectionTypeKey} appears ${count} times`,
        severity: ValidationSeverity.INFO,
        suggestion: 'Review whether duplicated sections should be merged or kept separate',
      });
    }

    return {
      passed: true,
      issues,
      metadata: {
        duplicatedSectionTypes: issues.length,
      },
    };
  }
}
