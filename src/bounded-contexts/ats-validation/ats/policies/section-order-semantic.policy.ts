import { Injectable } from '@nestjs/common';
import type { SemanticResumeSnapshot } from '../interfaces';
import {
  type ValidationIssue,
  type ValidationResult,
  ValidationSeverity,
} from '../interfaces/validation-result.interface';
import type { SemanticPolicy } from './semantic-policy.interface';

/**
 * Section Order Semantic Policy
 *
 * GENERIC: Determines section order issues by comparing actual positions
 * against `ats.recommendedPosition` from the catalog.
 *
 * NO hardcoded section types - works with ANY sections defined in catalog.
 */
@Injectable()
export class SectionOrderSemanticPolicy implements SemanticPolicy {
  validate(snapshot: SemanticResumeSnapshot): ValidationResult {
    const issues: ValidationIssue[] = [];
    const currentOrder = this.uniqueOrder(snapshot);

    // Build recommended order from the DB-driven catalog, sorted by position
    const recommendedOrder = snapshot.sectionTypeCatalog
      .slice()
      .sort((a, b) => a.ats.recommendedPosition - b.ats.recommendedPosition)
      .map((entry) => entry.kind);

    // Build position map from catalog
    const positionMap = new Map<string, number>();
    for (const entry of snapshot.sectionTypeCatalog) {
      positionMap.set(entry.kind, entry.ats.recommendedPosition);
    }

    // Check for order mismatches
    this.checkPositionMismatches(currentOrder, positionMap, issues);

    return {
      passed: issues.every((issue) => issue.severity !== ValidationSeverity.ERROR),
      issues,
      metadata: {
        currentOrder,
        recommendedOrder,
      },
    };
  }

  private uniqueOrder(snapshot: SemanticResumeSnapshot): string[] {
    const seen = new Set<string>();
    const order: string[] = [];

    for (const item of snapshot.items) {
      if (seen.has(item.sectionKind)) {
        continue;
      }
      seen.add(item.sectionKind);
      order.push(item.sectionKind);
    }

    return order;
  }

  /**
   * Check if sections are out of their recommended order.
   * GENERIC: Uses catalog positions, not hardcoded section names.
   */
  private checkPositionMismatches(
    currentOrder: string[],
    positionMap: Map<string, number>,
    issues: ValidationIssue[],
  ): void {
    // Get positions for current order, defaulting to MAX for unknown sections
    const maxPosition = Number.MAX_SAFE_INTEGER;
    const currentPositions = currentOrder.map((kind) => positionMap.get(kind) ?? maxPosition);

    // Check each pair of adjacent sections
    for (let i = 0; i < currentPositions.length - 1; i++) {
      const currentPos = currentPositions[i];
      const nextPos = currentPositions[i + 1];

      // If a section with higher recommended position appears before one with lower
      if (currentPos > nextPos && currentPos !== maxPosition && nextPos !== maxPosition) {
        const currentKind = currentOrder[i];
        const nextKind = currentOrder[i + 1];

        issues.push({
          code: 'SECTION_ORDER_MISMATCH',
          message: `${currentKind} (recommended position ${currentPos}) appears before ${nextKind} (recommended position ${nextPos})`,
          severity: ValidationSeverity.INFO,
          suggestion: `Consider reordering sections to match recommended order`,
        });
      }
    }
  }
}
