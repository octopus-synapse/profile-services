export enum ValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

export interface ValidationIssue {
  code: string;
  message: string;
  severity: ValidationSeverity;
  location?: string;
  suggestion?: string;
}

export interface ValidationResult {
  passed: boolean;
  issues: ValidationIssue[];
  metadata?: Record<string, unknown>;
}

export interface SectionValidationResult extends ValidationResult {
  detectedSections: string[];
  missingSections: string[];
}

export interface FormatValidationResult extends ValidationResult {
  fileType: string;
  fileSize: number;
  isATSCompatible: boolean;
}

export interface TextExtractionResult extends ValidationResult {
  extractedText: string;
  wordCount: number;
  isEmpty: boolean;
  isImageBased: boolean;
}
