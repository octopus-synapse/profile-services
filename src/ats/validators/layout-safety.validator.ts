import { Injectable } from '@nestjs/common';
import {
  ValidationResult,
  ValidationIssue,
  ValidationSeverity,
} from '../interfaces';

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

    // Check for unsafe bullet characters
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

    // Check for text in shapes/boxes (simple heuristic)
    if (this.detectTextInShapes(text)) {
      issues.push({
        code: 'TEXT_IN_SHAPES',
        message: 'Document may contain text inside shapes or text boxes',
        severity: ValidationSeverity.WARNING,
        suggestion:
          'Move text out of shapes/boxes as ATS may not be able to read it',
      });
    }

    // Check for multi-column layout indicators
    if (this.detectMultiColumnLayout(text)) {
      issues.push({
        code: 'MULTI_COLUMN_LAYOUT_DETECTED',
        message: 'Multi-column layout detected, which may confuse ATS',
        severity: ValidationSeverity.WARNING,
        suggestion: 'Use single-column layout for optimal ATS parsing',
      });
    }

    // Check for excessive line breaks
    const excessiveBreaks = this.detectExcessiveLineBreaks(text);
    if (excessiveBreaks) {
      issues.push({
        code: 'EXCESSIVE_LINE_BREAKS',
        message: 'Document contains excessive blank lines',
        severity: ValidationSeverity.INFO,
        suggestion: 'Use consistent spacing between sections (1-2 blank lines)',
      });
    }

    // Check for horizontal lines/separators
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
    // Look for patterns that suggest text boxes or shapes
    // This is a simple heuristic and may not catch all cases
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

    // Look for lines with large gaps (suggesting columns)
    lines.forEach((line) => {
      // If a line has 10+ consecutive spaces, it might be a column separator
      if (/\s{10,}/.test(line)) {
        suspiciousLines++;
      }
    });

    // If more than 20% of lines have this pattern, likely multi-column
    return suspiciousLines > lines.length * 0.2;
  }

  private detectExcessiveLineBreaks(text: string): boolean {
    // Check for more than 3 consecutive line breaks
    return /\n\s*\n\s*\n\s*\n/.test(text);
  }

  private detectHorizontalLines(text: string): boolean {
    const lines = text.split('\n');

    return lines.some((line) => {
      const trimmed = line.trim();
      // Check for lines made of repeated characters (-, =, _, etc.)
      return /^[-=_*]{5,}$/.test(trimmed) || /^[─━═]{3,}$/.test(trimmed);
    });
  }
}
