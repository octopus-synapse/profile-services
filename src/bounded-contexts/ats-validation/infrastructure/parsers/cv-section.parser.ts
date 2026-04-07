import { Injectable } from '@nestjs/common';
import type {
  CVSection,
  ParsedCV,
  SectionValidationResult,
  ValidationIssue,
} from '../../domain/interfaces';
import { ValidationSeverity } from '../../domain/interfaces';
import { ATSSectionTypeAdapter } from '../../application/use-cases/ats-section-type.adapter';

/**
 * CVSectionParser - Parses CV text and detects sections using definition-driven patterns.
 *
 * All section detection keywords and mandatory requirements are loaded from
 * SectionType definitions via ATSSectionTypeAdapter. No hardcoded section knowledge.
 */
@Injectable()
export class CVSectionParser {
  constructor(private readonly atsSectionTypeAdapter: ATSSectionTypeAdapter) {}

  parseCV(text: string, fileName: string, fileType: string): ParsedCV {
    const lines = text.split('\n').map((line) => line.trim());
    const sections: CVSection[] = [];

    let currentSection: CVSection | null = null;
    let currentContent: string[] = [];

    lines.forEach((line, index) => {
      const detectedSection = this.detectSection(line);

      if (detectedSection) {
        // Save previous section if exists
        if (currentSection !== null && currentContent.length > 0) {
          const section: CVSection = {
            semanticKind: currentSection.semanticKind,
            title: currentSection.title,
            content: currentContent.join('\n').trim(),
            startLine: currentSection.startLine,
            endLine: index - 1,
            order: currentSection.order,
            confidence: currentSection.confidence,
          };
          sections.push(section);
        }

        // Start new section
        currentSection = {
          semanticKind: detectedSection.semanticKind,
          title: line,
          content: '',
          startLine: index,
          order: sections.length,
          confidence: detectedSection.confidence,
        };
        currentContent = [];
      } else if (currentSection !== null) {
        // Add to current section
        if (line) {
          currentContent.push(line);
        }
      }
    });

    // Add last section
    const finalSection = currentSection as CVSection | null;
    if (finalSection && currentContent.length > 0) {
      sections.push({
        semanticKind: finalSection.semanticKind,
        title: finalSection.title,
        content: currentContent.join('\n').trim(),
        startLine: finalSection.startLine ?? 0,
        endLine: lines.length - 1,
        order: finalSection.order ?? 0,
        confidence: finalSection.confidence,
      });
    }

    return {
      sections,
      rawText: text,
      metadata: {
        fileName,
        fileType,
        extractedAt: new Date(),
      },
    };
  }

  validateSections(parsedCV: ParsedCV): SectionValidationResult {
    const issues: ValidationIssue[] = [];
    const detectedSemanticKinds = parsedCV.sections.map((s) => s.semanticKind);
    const detectedSections = Array.from(new Set(detectedSemanticKinds));

    // Check for mandatory sections from SectionType definitions
    const mandatorySections = this.atsSectionTypeAdapter.getMandatorySectionTypes();
    const missingSections = mandatorySections.filter(
      (section) => !detectedSemanticKinds.includes(section.semanticKind),
    );

    if (missingSections.length > 0) {
      issues.push({
        code: 'MISSING_MANDATORY_SECTIONS',
        message: `Missing mandatory sections: ${missingSections.map((s) => s.semanticKind).join(', ')}`,
        severity: ValidationSeverity.ERROR,
        suggestion:
          'Add these sections to improve ATS compatibility and provide complete information',
      });
    }

    // Check for empty sections
    parsedCV.sections.forEach((section) => {
      if (!section.content || section.content.length < 10) {
        issues.push({
          code: 'EMPTY_SECTION',
          message: `Section "${section.title}" is empty or too short`,
          severity: ValidationSeverity.WARNING,
          location: section.title,
          suggestion: 'Add meaningful content to this section',
        });
      }
    });

    // Check for duplicate sections
    const sectionCounts = new Map<string, number>();
    detectedSemanticKinds.forEach((kind) => {
      sectionCounts.set(kind, (sectionCounts.get(kind) ?? 0) + 1);
    });

    sectionCounts.forEach((count, semanticKind) => {
      if (count > 1) {
        issues.push({
          code: 'DUPLICATE_SECTION',
          message: `Section "${semanticKind}" appears ${count} times`,
          severity: ValidationSeverity.WARNING,
          suggestion: 'Combine duplicate sections into one',
        });
      }
    });

    // Check if any sections were detected at all
    if (parsedCV.sections.length === 0) {
      issues.push({
        code: 'NO_SECTIONS_DETECTED',
        message: 'Could not detect any CV sections',
        severity: ValidationSeverity.ERROR,
        suggestion: 'Use clear section headers like "Experience", "Education", "Skills"',
      });
    }

    return {
      passed: issues.filter((i) => i.severity === ValidationSeverity.ERROR).length === 0,
      issues,
      detectedSections,
      missingSections: missingSections.map((s) => s.semanticKind),
      metadata: {
        totalSections: parsedCV.sections.length,
        uniqueSections: detectedSections.length,
      },
    };
  }

  /**
   * Detect section type from a line using definition-driven patterns.
   * Returns the semantic kind and confidence level.
   */
  private detectSection(line: string): { semanticKind: string; confidence: number } | null {
    const result = this.atsSectionTypeAdapter.detectSectionType(line);

    if (result) {
      return {
        semanticKind: result.pattern.semanticKind,
        confidence: result.confidence,
      };
    }

    return null;
  }
}
