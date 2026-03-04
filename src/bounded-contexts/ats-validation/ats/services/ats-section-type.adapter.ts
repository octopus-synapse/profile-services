import { Injectable } from '@nestjs/common';
import { SectionTypeRepository } from '@/shared-kernel/repositories/section-type.repository';
import type { SectionTypeWithDefinition } from '@/shared-kernel/types/generic-section.types';

/**
 * Section Detection Pattern - extracted from SectionType definitions
 */
export interface SectionDetectionPattern {
  semanticKind: string;
  sectionTypeKey: string;
  keywords: string[];
  multiWord: string[];
  isMandatory: boolean;
  recommendedPosition: number;
}

/**
 * ATSSectionTypeAdapter
 *
 * Adapts SectionType definitions for ATS validation use cases.
 * All section detection keywords come from definition.ats.sectionDetection.
 * No hardcoded section knowledge in the ATS validator code.
 */
@Injectable()
export class ATSSectionTypeAdapter {
  private patternsCache: SectionDetectionPattern[] | null = null;

  constructor(private readonly sectionTypeRepo: SectionTypeRepository) {}

  /**
   * Get all section detection patterns from SectionType definitions.
   */
  getDetectionPatterns(): SectionDetectionPattern[] {
    if (this.patternsCache) {
      return this.patternsCache;
    }

    const sectionTypes = this.sectionTypeRepo.getAll();
    this.patternsCache = sectionTypes.map((st) => this.toDetectionPattern(st));
    return this.patternsCache;
  }

  /**
   * Get mandatory section types for ATS.
   */
  getMandatorySectionTypes(): SectionDetectionPattern[] {
    return this.getDetectionPatterns().filter((p) => p.isMandatory);
  }

  /**
   * Get patterns sorted by recommended ATS position.
   */
  getPatternsByPosition(): SectionDetectionPattern[] {
    return [...this.getDetectionPatterns()].sort(
      (a, b) => a.recommendedPosition - b.recommendedPosition,
    );
  }

  /**
   * Find matching section type by header text.
   * Returns the best match based on keyword/phrase matching.
   */
  detectSectionType(
    headerText: string,
  ): { pattern: SectionDetectionPattern; confidence: number } | null {
    const normalizedHeader = headerText.toLowerCase().trim();

    // Skip very short or too long headers
    if (normalizedHeader.length < 3 || normalizedHeader.split(/\s+/).length > 5) {
      return null;
    }

    let bestMatch: {
      pattern: SectionDetectionPattern;
      confidence: number;
    } | null = null;

    for (const pattern of this.getDetectionPatterns()) {
      // Check exact multi-word matches first (highest confidence)
      const exactMatch = pattern.multiWord.some(
        (phrase) => normalizedHeader === phrase.toLowerCase(),
      );

      if (exactMatch) {
        return { pattern, confidence: 1.0 };
      }

      // Check if header contains any multi-word phrases
      const phraseMatch = pattern.multiWord.some((phrase) =>
        normalizedHeader.includes(phrase.toLowerCase()),
      );

      if (phraseMatch) {
        if (!bestMatch || bestMatch.confidence < 0.9) {
          bestMatch = { pattern, confidence: 0.9 };
        }
        continue;
      }

      // Check keyword matches
      const keywordMatch = pattern.keywords.some((keyword) =>
        normalizedHeader.includes(keyword.toLowerCase()),
      );

      if (keywordMatch) {
        if (!bestMatch || bestMatch.confidence < 0.8) {
          bestMatch = { pattern, confidence: 0.8 };
        }
      }
    }

    return bestMatch && bestMatch.confidence >= 0.8 ? bestMatch : null;
  }

  /**
   * Clear the patterns cache (call when SectionType definitions change).
   */
  clearCache(): void {
    this.patternsCache = null;
  }

  private toDetectionPattern(sectionType: SectionTypeWithDefinition): SectionDetectionPattern {
    const ats = sectionType.definition.ats;
    const detection = ats?.sectionDetection;

    return {
      semanticKind: sectionType.semanticKind,
      sectionTypeKey: sectionType.key,
      keywords: detection?.keywords ?? [],
      multiWord: detection?.multiWord ?? [],
      isMandatory: ats?.isMandatory ?? false,
      recommendedPosition: ats?.recommendedPosition ?? 99,
    };
  }
}
