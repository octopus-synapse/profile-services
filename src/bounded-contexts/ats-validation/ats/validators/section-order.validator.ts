import { Injectable } from '@nestjs/common';
import { ParsedCV, ValidationIssue, ValidationResult, ValidationSeverity } from '../interfaces';
import { ATSSectionTypeAdapter } from '../services/ats-section-type.adapter';

/**
 * SectionOrderValidator - Validates section order using definition-driven rules.
 *
 * Recommended section positions are loaded from SectionType.definition.ats.recommendedPosition.
 * No hardcoded section order knowledge.
 */
@Injectable()
export class SectionOrderValidator {
  constructor(private readonly atsSectionTypeAdapter: ATSSectionTypeAdapter) {}

  validate(parsedCV: ParsedCV): ValidationResult {
    const issues: ValidationIssue[] = [];

    const currentOrder = parsedCV.sections.map((s) => s.semanticKind);

    // Get recommended order from definitions
    const recommendedPatterns = this.atsSectionTypeAdapter.getPatternsByPosition();

    // Check experience vs education order (common rule)
    const expIndex = currentOrder.indexOf('experience');
    const eduIndex = currentOrder.indexOf('education');

    if (expIndex !== -1 && eduIndex !== -1 && expIndex > eduIndex) {
      issues.push({
        code: 'EXPERIENCE_AFTER_EDUCATION',
        message:
          'Experience section should typically come before Education for experienced professionals',
        severity: ValidationSeverity.WARNING,
        suggestion:
          'Consider placing Experience before Education (unless you are a recent graduate)',
      });
    }

    const orderViolations = this.detectOrderViolations(currentOrder);
    if (orderViolations.length > 0) {
      orderViolations.forEach((violation) => {
        issues.push(violation);
      });
    }

    // Check summary position
    const summaryIndex = currentOrder.indexOf('summary');
    if (summaryIndex > 2 && summaryIndex !== -1) {
      issues.push({
        code: 'SUMMARY_TOO_LATE',
        message: 'Professional Summary should appear near the beginning of the CV',
        severity: ValidationSeverity.INFO,
        suggestion: 'Move Summary/Profile section to the top, after contact information',
      });
    }

    return {
      passed: issues.filter((i) => i.severity === ValidationSeverity.ERROR).length === 0,
      issues,
      metadata: {
        currentOrder,
        recommendedOrder: recommendedPatterns.map((p) => p.semanticKind),
      },
    };
  }

  private detectOrderViolations(currentOrder: string[]): ValidationIssue[] {
    const violations: ValidationIssue[] = [];

    // References should be at the end
    const refIndex = currentOrder.indexOf('references');
    if (refIndex !== -1 && refIndex < currentOrder.length - 2) {
      violations.push({
        code: 'REFERENCES_TOO_EARLY',
        message: 'References section should typically appear at the end',
        severity: ValidationSeverity.INFO,
        suggestion: 'Move References to the end of your CV',
      });
    }

    // Skills should come before interests
    const interestsIndex = currentOrder.indexOf('interests');
    const skillsIndex = currentOrder.indexOf('skills');

    if (interestsIndex !== -1 && skillsIndex !== -1 && interestsIndex < skillsIndex) {
      violations.push({
        code: 'INTERESTS_BEFORE_SKILLS',
        message: 'Interests section should come after Skills',
        severity: ValidationSeverity.INFO,
        suggestion: 'Place Skills before Interests to emphasize professional qualifications',
      });
    }

    return violations;
  }
}
