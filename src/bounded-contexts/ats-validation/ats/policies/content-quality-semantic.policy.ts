import { Injectable } from '@nestjs/common';
import type { SectionKind } from '@/shared-kernel/dtos/semantic-sections.dto';
import type { SemanticResumeSnapshot, SemanticSectionItem } from '../interfaces';
import {
  type ValidationIssue,
  type ValidationResult,
  ValidationSeverity,
} from '../interfaces/validation-result.interface';
import type { SemanticPolicy } from './semantic-policy.interface';

@Injectable()
export class ContentQualitySemanticPolicy implements SemanticPolicy {
  private readonly requiredRolesByKind: Partial<Record<SectionKind, string[]>> = {
    WORK_EXPERIENCE: ['ORGANIZATION', 'JOB_TITLE'],
    EDUCATION: ['ORGANIZATION', 'DEGREE'],
    CERTIFICATION: ['TITLE', 'ORGANIZATION'],
  };

  validate(snapshot: SemanticResumeSnapshot): ValidationResult {
    const issues: ValidationIssue[] = [];

    for (const item of snapshot.items) {
      this.checkRequiredRoles(item, issues);
      this.checkTextQuality(item, issues);
    }

    return {
      passed: issues.every((issue) => issue.severity !== ValidationSeverity.ERROR),
      issues,
      metadata: {
        checkedItems: snapshot.items.length,
      },
    };
  }

  private checkRequiredRoles(item: SemanticSectionItem, issues: ValidationIssue[]): void {
    const requiredRoles = this.requiredRolesByKind[item.sectionKind];
    if (!requiredRoles || requiredRoles.length === 0) {
      return;
    }

    const availableRoles = new Set(item.values.map((value) => value.role));
    const missingRoles = requiredRoles.filter((role) => !availableRoles.has(role as never));

    if (missingRoles.length > 0) {
      issues.push({
        code: 'MISSING_REQUIRED_SEMANTIC_ROLES',
        message: `Section kind ${item.sectionKind} is missing semantic roles: ${missingRoles.join(', ')}`,
        severity: ValidationSeverity.WARNING,
        suggestion: 'Ensure required semantic roles are mapped in section definition and content',
      });
    }
  }

  private checkTextQuality(item: SemanticSectionItem, issues: ValidationIssue[]): void {
    const description = item.values.find((value) => value.role === 'DESCRIPTION');

    if (!description || typeof description.value !== 'string') {
      return;
    }

    const normalized = description.value.trim();

    if (normalized.length > 0 && normalized.length < 30) {
      issues.push({
        code: 'DESCRIPTION_TOO_SHORT',
        message: `Description for ${item.sectionKind} is too short for ATS relevance`,
        severity: ValidationSeverity.INFO,
        suggestion: 'Provide more context and measurable outcomes in description text',
      });
    }
  }
}
