import { Injectable } from '@nestjs/common';
import type {
  SectionTypeAtsEntry,
  SemanticResumeSnapshot,
  SemanticSectionItem,
} from '../../interfaces';
import {
  type ValidationIssue,
  type ValidationResult,
  ValidationSeverity,
} from '../../interfaces/validation-result.interface';
import type { SemanticPolicy } from './semantic-policy.interface';

/**
 * Content Quality Semantic Policy
 *
 * Validates that section items contain required semantic roles.
 * Reads `requiredSemanticRoles` from the sectionTypeCatalog — NOT hardcoded.
 */
@Injectable()
export class ContentQualitySemanticPolicy implements SemanticPolicy {
  validate(snapshot: SemanticResumeSnapshot): ValidationResult {
    const issues: ValidationIssue[] = [];
    const catalogByKind = this.buildCatalogByKind(snapshot.sectionTypeCatalog);

    for (const item of snapshot.items) {
      this.checkRequiredRoles(item, catalogByKind, issues);
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

  private buildCatalogByKind(catalog: SectionTypeAtsEntry[]): Map<string, SectionTypeAtsEntry> {
    return new Map(catalog.map((entry) => [entry.kind, entry]));
  }

  private checkRequiredRoles(
    item: SemanticSectionItem,
    catalogByKind: Map<string, SectionTypeAtsEntry>,
    issues: ValidationIssue[],
  ): void {
    const catalogEntry = catalogByKind.get(item.sectionKind);
    const requiredRoles = catalogEntry?.ats.scoring.requiredSemanticRoles ?? [];

    if (requiredRoles.length === 0) {
      return;
    }

    const availableRoles = new Set(item.values.map((value) => value.role));
    const missingRoles = requiredRoles.filter((role) => !availableRoles.has(role));

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
