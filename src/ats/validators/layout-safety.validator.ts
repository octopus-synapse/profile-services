import { Injectable } from '@nestjs/common';
import {
  ValidationResult,
  ValidationIssue,
  ValidationSeverity,
} from '../interfaces';
import { LAYOUT_VALIDATION } from './constants';

@Injectable()
export class LayoutSafetyValidator {
  // ATS-safe bullet characters
  private readonly SAFE_BULLETS = ['-', '*', '•'];

  // Potentially problematic bullet characters
  private readonly UNSAFE_BULLETS = [
    '●',
    '○',
    '◆',
    '◇',
    '■',
    '□',
    '▪',
    '▫',
    '★',
    '☆',
    '►',
    '▼',
    '▲',
    '▶',
    '◀',
    '→',
    '⇒',
    '➔',
    '➢',
    '➤',
  ];

  validate(text: string): ValidationResult {
    const issues: ValidationIssue[] = [];

    const unsafeBullets = this.detectUnsafeBullets(text);
    if (unsafeBullets.length > 0) {
      issues.push({
        code: 'UNSAFE_BULLET_CHARACTERS',
        message: `Found ${unsafeBullets.length} unsafe bullet character(s): ${unsafeBullets.join(', ')}`,
        severity: ValidationSeverity.WARNING,
        suggestion:
          'Replace with standard bullets (-, *, •) for better ATS compatibility',
      });
    }

    if (this.detectTextInShapes(text)) {
      issues.push({
        code: 'TEXT_IN_SHAPES',
        message: 'Document may contain text inside shapes or text boxes',
        severity: ValidationSeverity.WARNING,
        suggestion:
          'Move text out of shapes/boxes as ATS may not be able to read it',
      });
    }

    if (this.detectMultiColumnLayout(text)) {
      issues.push({
        code: 'MULTI_COLUMN_LAYOUT_DETECTED',
        message: 'Multi-column layout detected, which may confuse ATS',
        severity: ValidationSeverity.WARNING,
        suggestion: 'Use single-column layout for optimal ATS parsing',
      });
    }

    const excessiveBreaks = this.detectExcessiveLineBreaks(text);
    if (excessiveBreaks) {
      issues.push({
        code: 'EXCESSIVE_LINE_BREAKS',
        message: 'Document contains excessive blank lines',
        severity: ValidationSeverity.INFO,
        suggestion: 'Use consistent spacing between sections (1-2 blank lines)',
      });
    }

    if (this.detectHorizontalLines(text)) {
      issues.push({
        code: 'HORIZONTAL_LINES_DETECTED',
        message: 'Document uses horizontal lines/separators',
        severity: ValidationSeverity.INFO,
        suggestion:
          'Some ATS may have issues with horizontal lines - use sparingly',
      });
    }

    return {
      passed:
        issues.filter((i) => i.severity === ValidationSeverity.ERROR).length ===
        0,
      issues,
      metadata: {
        unsafeBulletCount: unsafeBullets.length,
        hasMultiColumn: this.detectMultiColumnLayout(text),
        hasTextInShapes: this.detectTextInShapes(text),
      },
    };
  }

  private detectUnsafeBullets(text: string): string[] {
    const found = new Set<string>();

    this.UNSAFE_BULLETS.forEach((bullet) => {
      if (text.includes(bullet)) {
        found.add(bullet);
      }
    });

    return Array.from(found);
  }

  private detectTextInShapes(text: string): boolean {
    const shapePatterns = [
      /┌.*┐/, // Box corners
      /╔.*╗/, // Double box corners
      /\+[-=]+\+/, // ASCII boxes
    ];

    return shapePatterns.some((pattern) => pattern.test(text));
  }

  private detectMultiColumnLayout(text: string): boolean {
    const lines = text.split('\n');
    let suspiciousLines = 0;

    const spacingPattern = new RegExp(
      `\\s{${LAYOUT_VALIDATION.COLUMN_SEPARATOR_SPACING},}`,
    );

    lines.forEach((line) => {
      if (spacingPattern.test(line)) {
        suspiciousLines++;
      }
    });

    return (
      suspiciousLines > lines.length * LAYOUT_VALIDATION.MULTI_COLUMN_PERCENTAGE
    );
  }

  private detectExcessiveLineBreaks(text: string): boolean {
    const newlinePattern = '\\n\\s*'.repeat(
      LAYOUT_VALIDATION.EXCESSIVE_NEWLINES + 1,
    );
    return new RegExp(newlinePattern).test(text);
  }

  private detectHorizontalLines(text: string): boolean {
    const lines = text.split('\n');

    return lines.some((line) => {
      const trimmed = line.trim();
      const asciiPattern = new RegExp(
        `^[-=_*]{${LAYOUT_VALIDATION.HORIZONTAL_LINE_MIN_LENGTH},}$`,
      );
      const unicodePattern = new RegExp(
        `^[─━═]{${LAYOUT_VALIDATION.HORIZONTAL_LINE_UNICODE_MIN},}$`,
      );
      return asciiPattern.test(trimmed) || unicodePattern.test(trimmed);
    });
  }
}
