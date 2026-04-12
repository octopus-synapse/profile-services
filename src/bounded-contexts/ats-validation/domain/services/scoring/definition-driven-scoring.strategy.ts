/**
 * Definition-Driven Scoring Strategy
 *
 * ONE generic scorer that reads scoring config from the section type definition.
 * Replaces WorkExperienceScoringStrategy, EducationScoringStrategy,
 * and CertificationScoringStrategy — no more per-type classes.
 *
 * Scoring algorithm:
 *   score = baseScore + Σ(fieldWeight for each non-empty semantic value)
 *   clamped to [0, 100]
 */

import { Injectable } from '@nestjs/common';
import type { SemanticSectionItem } from '@/shared-kernel/schemas/sections';
import type { SectionTypeAtsEntry } from '../../interfaces';

export interface DefinitionScoringInput {
  item: SemanticSectionItem;
  atsConfig: SectionTypeAtsEntry['ats'];
}

@Injectable()
export class DefinitionDrivenScoringStrategy {
  /**
   * Score an item using the ATS config from its section type definition.
   * If no fieldWeights are defined, falls back to density-based scoring.
   */
  score(input: DefinitionScoringInput): number {
    const { item, atsConfig } = input;
    const { baseScore, fieldWeights } = atsConfig.scoring;

    // If no fieldWeights defined, use density-based fallback
    if (Object.keys(fieldWeights).length === 0) {
      return this.densityScore(item, baseScore);
    }

    let score = baseScore;

    for (const [role, weight] of Object.entries(fieldWeights)) {
      const value = item.values.find((v) => v.role === role)?.value;
      if (this.isNonEmpty(value)) {
        score += weight;
      }
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Density-based fallback: baseScore + (proportion of non-empty values × 45).
   */
  private densityScore(item: SemanticSectionItem, baseScore: number): number {
    if (item.values.length === 0) {
      return Math.max(20, baseScore);
    }

    const nonEmpty = item.values.filter((v) => this.isNonEmpty(v.value)).length;
    const density = nonEmpty / item.values.length;

    return Math.min(100, Math.round(baseScore + density * 45));
  }

  private isNonEmpty(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (value instanceof Date) return true;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }
}
