import { Injectable } from '@nestjs/common';
import { FormatValidationResult, ValidationIssue, ValidationSeverity } from '../interfaces';
import { FORMAT_VALIDATION } from './constants';

@Injectable()
export class FormatValidator {
  private readonly ATS_SAFE_FILE_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  validate(file: Express.Multer.File, extractedText: string): FormatValidationResult {
    const issues: ValidationIssue[] = [];

    const isATSSafeType = this.ATS_SAFE_FILE_TYPES.includes(file.mimetype);
    if (!isATSSafeType) {
      issues.push({
        code: 'UNSUPPORTED_FILE_TYPE',
        message: `File type ${file.mimetype} is not ATS-compatible`,
        severity: ValidationSeverity.ERROR,
        suggestion: 'Use PDF or DOCX format for best ATS compatibility',
      });
    }

    if (this.detectTables(extractedText)) {
      issues.push({
        code: 'TABLES_DETECTED',
        message: 'Document may contain tables which can interfere with ATS parsing',
        severity: ValidationSeverity.WARNING,
        suggestion: 'Replace tables with simple text formatting for better ATS compatibility',
      });
    }

    if (this.detectMultiColumn(extractedText)) {
      issues.push({
        code: 'MULTI_COLUMN_LAYOUT',
        message: 'Document appears to use multi-column layout',
        severity: ValidationSeverity.WARNING,
        suggestion: 'Use single-column layout for optimal ATS parsing',
      });
    }

    const specialCharCount = this.countSpecialFormatting(extractedText);
    if (specialCharCount > FORMAT_VALIDATION.MAX_SPECIAL_CHAR_COUNT) {
      issues.push({
        code: 'EXCESSIVE_SPECIAL_FORMATTING',
        message: 'Document contains excessive special characters or formatting',
        severity: ValidationSeverity.INFO,
        suggestion: 'Keep formatting simple for better ATS compatibility',
      });
    }

    return {
      passed: issues.filter((i) => i.severity === ValidationSeverity.ERROR).length === 0,
      issues,
      fileType: file.mimetype,
      fileSize: file.size,
      isATSCompatible:
        isATSSafeType && issues.filter((i) => i.severity === ValidationSeverity.ERROR).length === 0,
      metadata: {
        hasTable: this.detectTables(extractedText),
        hasMultiColumn: this.detectMultiColumn(extractedText),
        specialCharCount,
      },
    };
  }

  private detectTables(text: string): boolean {
    const lines = text.split('\n');
    let pipeCount = 0;
    let tabCount = 0;

    lines.forEach((line) => {
      if (line.includes('|')) pipeCount++;
      if (line.includes('\t')) tabCount++;
    });

    return (
      pipeCount > FORMAT_VALIDATION.TABLE_PIPE_THRESHOLD ||
      tabCount > FORMAT_VALIDATION.TABLE_TAB_THRESHOLD
    );
  }

  private detectMultiColumn(text: string): boolean {
    const lines = text.split('\n');

    const spacingPattern = new RegExp(`\\s{${FORMAT_VALIDATION.MULTI_COLUMN_SPACING},}`);
    let suspiciousLines = 0;

    lines.forEach((line) => {
      if (spacingPattern.test(line)) {
        suspiciousLines++;
      }
    });

    return suspiciousLines > FORMAT_VALIDATION.MULTI_COLUMN_LINE_THRESHOLD;
  }

  private countSpecialFormatting(text: string): number {
    const specialChars = /[•●○◆◇■□▪▫★☆→←↑↓⇒⇐⇑⇓►▼▲▶◀]/g;
    const matches = text.match(specialChars);
    return matches ? matches.length : 0;
  }
}
