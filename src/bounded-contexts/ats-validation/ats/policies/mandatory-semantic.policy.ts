import { Injectable } from '@nestjs/common';
import type { SemanticResumeSnapshot } from '../interfaces';
import {
  type ValidationIssue,
  type ValidationResult,
  ValidationSeverity,
} from '../interfaces/validation-result.interface';
import type { SemanticPolicy } from './semantic-policy.interface';

/**
 * Mandatory Semantic Policy
 *
 * Determines which section kinds are mandatory by reading `ats.isMandatory`
 * from the snapshot's sectionTypeCatalog — NOT hardcoded.
 */
@Injectable()
export class MandatorySemanticPolicy implements SemanticPolicy {
  validate(snapshot: SemanticResumeSnapshot): ValidationResult {
    const issues: ValidationIssue[] = [];
    const detectedKinds = new Set(snapshot.items.map((item) => item.sectionKind));

    // Read mandatory kinds from the DB-driven catalog
    const mandatoryKinds = snapshot.sectionTypeCatalog
      .filter((entry) => entry.ats.isMandatory)
      .map((entry) => entry.kind);

    const missingKinds = mandatoryKinds.filter((kind) => !detectedKinds.has(kind));

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
        mandatoryKinds,
      },
    };
  }
}
