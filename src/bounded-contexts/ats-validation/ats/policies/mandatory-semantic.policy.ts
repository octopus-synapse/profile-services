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
export class MandatorySemanticPolicy implements SemanticPolicy {
  private readonly mandatoryKinds: SectionKind[] = ['WORK_EXPERIENCE', 'EDUCATION', 'SKILL_SET'];

  validate(snapshot: SemanticResumeSnapshot): ValidationResult {
    const issues: ValidationIssue[] = [];
    const detectedKinds = new Set(snapshot.items.map((item) => item.sectionKind));

    const missingKinds = this.mandatoryKinds.filter((kind) => !detectedKinds.has(kind));

    if (missingKinds.length > 0) {
      issues.push({
        code: 'MISSING_MANDATORY_SEMANTIC_KINDS',
        message: `Missing mandatory semantic kinds: ${missingKinds.join(', ')}`,
        severity: ValidationSeverity.WARNING,
        suggestion: 'Add sections that cover these semantic kinds for ATS completeness',
      });
    }

    if (snapshot.items.length === 0) {
      issues.push({
        code: 'NO_SEMANTIC_ITEMS_DETECTED',
        message: 'No semantic section items found in resume snapshot',
        severity: ValidationSeverity.ERROR,
        suggestion: 'Ensure resume has at least one section item mapped to semantic kinds',
      });
    }

    return {
      passed: issues.every((issue) => issue.severity !== ValidationSeverity.ERROR),
      issues,
      metadata: {
        detectedKinds: Array.from(detectedKinds),
        mandatoryKinds: this.mandatoryKinds,
      },
    };
  }
}
