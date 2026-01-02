import { Injectable } from '@nestjs/common';
import {
  CVSectionType,
  ParsedCV,
  ValidationResult,
  ValidationIssue,
  ValidationSeverity,
} from '../interfaces';

@Injectable()
export class SectionOrderValidator {
  private getSectionName(type: CVSectionType): string {
    return CVSectionType[type] as string;
  }

  // Recommended section order for ATS
  private readonly RECOMMENDED_ORDER: CVSectionType[] = [
    CVSectionType.PERSONAL_INFO,
    CVSectionType.SUMMARY,
    CVSectionType.EXPERIENCE,
    CVSectionType.EDUCATION,
    CVSectionType.SKILLS,
    CVSectionType.CERTIFICATIONS,
    CVSectionType.PROJECTS,
    CVSectionType.AWARDS,
    CVSectionType.PUBLICATIONS,
    CVSectionType.LANGUAGES,
    CVSectionType.INTERESTS,
    CVSectionType.REFERENCES,
  ];

  validate(parsedCV: ParsedCV): ValidationResult {
    const issues: ValidationIssue[] = [];

    // Get sections in current order
    const currentOrder = parsedCV.sections.map((s) => s.type);

    // Check if Experience comes before Education (common ATS preference)
    const expIndex = currentOrder.indexOf(CVSectionType.EXPERIENCE);
    const eduIndex = currentOrder.indexOf(CVSectionType.EDUCATION);

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

    // Check for logical flow violations
    const orderViolations = this.detectOrderViolations(currentOrder);
    if (orderViolations.length > 0) {
      orderViolations.forEach((violation) => {
        issues.push(violation);
      });
    }

    // Check if Summary comes early
    const summaryIndex = currentOrder.indexOf(CVSectionType.SUMMARY);
    if (summaryIndex > 2 && summaryIndex !== -1) {
      issues.push({
        code: 'SUMMARY_TOO_LATE',
        message:
          'Professional Summary should appear near the beginning of the CV',
        severity: ValidationSeverity.INFO,
        suggestion:
          'Move Summary/Profile section to the top, after contact information',
      });
    }

    return {
      passed:
        issues.filter((i) => i.severity === ValidationSeverity.ERROR).length ===
        0,
      issues,
      metadata: {
        currentOrder: currentOrder.map((type) => this.getSectionName(type)),
        recommendedOrder: this.RECOMMENDED_ORDER.map((type) =>
          this.getSectionName(type),
        ),
      },
    };
  }

  private detectOrderViolations(
    currentOrder: CVSectionType[],
  ): ValidationIssue[] {
    const violations: ValidationIssue[] = [];

    // Check if References comes too early
    const refIndex = currentOrder.indexOf(CVSectionType.REFERENCES);
    if (refIndex !== -1 && refIndex < currentOrder.length - 2) {
      violations.push({
        code: 'REFERENCES_TOO_EARLY',
        message: 'References section should typically appear at the end',
        severity: ValidationSeverity.INFO,
        suggestion: 'Move References to the end of your CV',
      });
    }

    // Check if Interests comes before Skills
    const interestsIndex = currentOrder.indexOf(CVSectionType.INTERESTS);
    const skillsIndex = currentOrder.indexOf(CVSectionType.SKILLS);

    if (
      interestsIndex !== -1 &&
      skillsIndex !== -1 &&
      interestsIndex < skillsIndex
    ) {
      violations.push({
        code: 'INTERESTS_BEFORE_SKILLS',
        message: 'Interests section should come after Skills',
        severity: ValidationSeverity.INFO,
        suggestion:
          'Place Skills before Interests to emphasize professional qualifications',
      });
    }

    return violations;
  }
}
