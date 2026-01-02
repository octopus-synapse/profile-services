import { ValidationResult, ValidationIssue, ValidationSeverity } from '../interfaces';

export class ValidationResponseDto {
  passed: boolean;
  issues: ValidationIssue[];
  summary: {
    totalIssues: number;
    errors: number;
    warnings: number;
    info: number;
  };
  results: {
    fileIntegrity?: ValidationResult;
    textExtraction?: ValidationResult;
    encoding?: ValidationResult;
    sectionParsing?: ValidationResult;
    formatValidation?: ValidationResult;
    sectionOrder?: ValidationResult;
    mandatorySections?: ValidationResult;
    grammar?: ValidationResult;
    layout?: ValidationResult;
  };

  constructor(results: Partial<ValidationResponseDto['results']>) {
    this.results = results;
    this.issues = this.collectIssues();
    this.summary = this.calculateSummary();
    this.passed = this.summary.errors === 0;
  }

  private collectIssues(): ValidationIssue[] {
    const allIssues: ValidationIssue[] = [];
    Object.values(this.results).forEach((result) => {
      if (result && result.issues) {
        allIssues.push(...result.issues);
      }
    });
    return allIssues;
  }

  private calculateSummary() {
    return {
      totalIssues: this.issues.length,
      errors: this.issues.filter((i) => i.severity === ValidationSeverity.ERROR)
        .length,
      warnings: this.issues.filter(
        (i) => i.severity === ValidationSeverity.WARNING,
      ).length,
      info: this.issues.filter((i) => i.severity === ValidationSeverity.INFO)
        .length,
    };
  }
}
