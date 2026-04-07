import { Injectable } from '@nestjs/common';
import { ValidationSeverity } from '../../domain/interfaces';
import type { ParsedCV, ValidationIssue, ValidationResult } from '../../domain/interfaces';
import { ATSSectionTypeAdapter } from '../../application/use-cases/ats-section-type.adapter';

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

    // Build a position map from definition-driven recommended positions
    const positionMap = new Map<string, number>();
    for (const pattern of recommendedPatterns) {
      positionMap.set(pattern.semanticKind, pattern.recommendedPosition);
    }

    // Check for ordering violations based on recommended positions
    const orderViolations = this.detectPositionViolations(currentOrder, positionMap);
    issues.push(...orderViolations);

    return {
      passed: issues.filter((i) => i.severity === ValidationSeverity.ERROR).length === 0,
      issues,
      metadata: {
        currentOrder,
        recommendedOrder: recommendedPatterns.map((p) => p.semanticKind),
      },
    };
  }

  /**
   * Detect ordering violations by comparing actual section positions
   * against definition-recommended positions.
   */
  private detectPositionViolations(
    currentOrder: string[],
    positionMap: Map<string, number>,
  ): ValidationIssue[] {
    const violations: ValidationIssue[] = [];

    for (let i = 0; i < currentOrder.length; i++) {
      const currentKind = currentOrder[i];
      const recommendedPos = positionMap.get(currentKind);

      if (recommendedPos === undefined) continue;

      // Check if this section is significantly out of position relative to its neighbors
      for (let j = i + 1; j < currentOrder.length; j++) {
        const laterKind = currentOrder[j];
        const laterRecommendedPos = positionMap.get(laterKind);

        if (laterRecommendedPos === undefined) continue;

        // A section with a higher recommended position appears before one with a lower position
        if (recommendedPos > laterRecommendedPos) {
          violations.push({
            code: 'SECTION_ORDER_SUBOPTIMAL',
            message: `Section '${laterKind}' is recommended to appear before '${currentKind}' for ATS optimization`,
            severity: ValidationSeverity.INFO,
            suggestion: `Consider reordering: place '${laterKind}' before '${currentKind}'`,
          });
          break; // One violation per section is enough
        }
      }
    }

    return violations;
  }
}
