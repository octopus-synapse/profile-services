import { Injectable } from '@nestjs/common';
import {
  ValidationResult,
  ValidationIssue,
  ValidationSeverity,
} from '../interfaces';
import iconv from 'iconv-lite';

@Injectable()
export class EncodingNormalizerService {
  private readonly PROBLEMATIC_CHARS = [
    { char: '\u2018', replacement: "'", name: 'left single quotation mark' },
    { char: '\u2019', replacement: "'", name: 'right single quotation mark' },
    { char: '\u201C', replacement: '"', name: 'left double quotation mark' },
    { char: '\u201D', replacement: '"', name: 'right double quotation mark' },
    { char: '\u2013', replacement: '-', name: 'en dash' },
    { char: '\u2014', replacement: '-', name: 'em dash' },
    { char: '\u2026', replacement: '...', name: 'ellipsis' },
    { char: '\u00A0', replacement: ' ', name: 'non-breaking space' },
    { char: '\u00AD', replacement: '', name: 'soft hyphen' },
  ];

  normalizeText(text: string): { normalizedText: string; result: ValidationResult } {
    const issues: ValidationIssue[] = [];
    let normalizedText = text;

    // Check for encoding issues
    if (!this.isValidUTF8(text)) {
      issues.push({
        code: 'INVALID_ENCODING',
        message: 'Text contains invalid UTF-8 sequences',
        severity: ValidationSeverity.WARNING,
        suggestion: 'Re-save the document with UTF-8 encoding',
      });

      // Attempt to fix encoding
      try {
        const buffer = Buffer.from(text, 'binary');
        normalizedText = iconv.decode(buffer, 'utf8');
      } catch (error) {
        issues.push({
          code: 'ENCODING_FIX_FAILED',
          message: 'Could not automatically fix encoding issues',
          severity: ValidationSeverity.ERROR,
        });
      }
    }

    // Normalize to NFC (Canonical Decomposition, followed by Canonical Composition)
    normalizedText = normalizedText.normalize('NFC');

    // Track problematic characters
    const foundProblematicChars = new Set<string>();

    // Replace problematic characters
    this.PROBLEMATIC_CHARS.forEach(({ char, replacement, name }) => {
      if (normalizedText.includes(char)) {
        foundProblematicChars.add(name);
        normalizedText = normalizedText.split(char).join(replacement);
      }
    });

    if (foundProblematicChars.size > 0) {
      issues.push({
        code: 'SPECIAL_CHARS_NORMALIZED',
        message: `Normalized ${foundProblematicChars.size} type(s) of special characters: ${Array.from(foundProblematicChars).join(', ')}`,
        severity: ValidationSeverity.INFO,
        suggestion:
          'These characters were replaced with ATS-safe equivalents',
      });
    }

    // Check for zero-width characters
    const zeroWidthChars = [
      '\u200B', // Zero-width space
      '\u200C', // Zero-width non-joiner
      '\u200D', // Zero-width joiner
      '\uFEFF', // Zero-width no-break space
    ];

    let hasZeroWidth = false;
    zeroWidthChars.forEach((char) => {
      if (normalizedText.includes(char)) {
        hasZeroWidth = true;
        normalizedText = normalizedText.split(char).join('');
      }
    });

    if (hasZeroWidth) {
      issues.push({
        code: 'ZERO_WIDTH_CHARS_REMOVED',
        message: 'Removed invisible zero-width characters',
        severity: ValidationSeverity.INFO,
        suggestion: 'Zero-width characters can cause ATS parsing issues',
      });
    }

    // Check for control characters
    const controlCharPattern = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
    if (controlCharPattern.test(normalizedText)) {
      normalizedText = normalizedText.replace(controlCharPattern, '');
      issues.push({
        code: 'CONTROL_CHARS_REMOVED',
        message: 'Removed control characters',
        severity: ValidationSeverity.INFO,
        suggestion: 'Control characters can cause parsing errors',
      });
    }

    // Check for unusual whitespace
    const unusualWhitespace = /[\x85\xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/g;
    if (unusualWhitespace.test(normalizedText)) {
      normalizedText = normalizedText.replace(unusualWhitespace, ' ');
      issues.push({
        code: 'UNUSUAL_WHITESPACE_NORMALIZED',
        message: 'Normalized unusual whitespace characters',
        severity: ValidationSeverity.INFO,
      });
    }

    // Check for accented characters (informational only, don't replace)
    const accentedChars = /[àáâãäåèéêëìíîïòóôõöùúûüýÿñçÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝŸÑÇ]/g;
    const accentedMatches = normalizedText.match(accentedChars);
    if (accentedMatches && accentedMatches.length > 0) {
      issues.push({
        code: 'ACCENTED_CHARS_DETECTED',
        message: `Found ${accentedMatches.length} accented character(s)`,
        severity: ValidationSeverity.INFO,
        suggestion:
          'Accented characters are supported but some ATS may have issues with them',
      });
    }

    return {
      normalizedText,
      result: {
        passed: issues.filter((i) => i.severity === ValidationSeverity.ERROR)
          .length === 0,
        issues,
        metadata: {
          originalLength: text.length,
          normalizedLength: normalizedText.length,
          charsDifference: text.length - normalizedText.length,
        },
      },
    };
  }

  private isValidUTF8(text: string): boolean {
    try {
      // Try to encode and decode
      const encoded = Buffer.from(text, 'utf8');
      const decoded = encoded.toString('utf8');
      return text === decoded;
    } catch {
      return false;
    }
  }
}
