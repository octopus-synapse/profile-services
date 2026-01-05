import { Injectable } from '@nestjs/common';
import {
  ValidationResult,
  ValidationIssue,
  ValidationSeverity,
} from '../interfaces';

@Injectable()
export class GrammarValidator {
  // Common spelling mistakes and their corrections
  private readonly COMMON_MISTAKES: Record<string, string> = {
    recieve: 'receive',
    seperate: 'separate',
    definately: 'definitely',
    occured: 'occurred',
    untill: 'until',
    sucessful: 'successful',
    succesful: 'successful',
    experiance: 'experience',
    responsable: 'responsible',
    managment: 'management',
    acheive: 'achieve',
    acheivement: 'achievement',
    commited: 'committed',
    developement: 'development',
    enviroment: 'environment',
  };

  // Patterns that suggest grammar issues
  private readonly GRAMMAR_PATTERNS = [
    {
      pattern: /\b(a)\s+(aeiou)/gi,
      message: 'Possible article error: "a" before vowel sound',
      severity: ValidationSeverity.WARNING,
    },
    {
      pattern: /\s{2,}/g,
      message: 'Multiple consecutive spaces detected',
      severity: ValidationSeverity.INFO,
    },
    {
      pattern: /[.!?]\s*[a-z]/g,
      message: 'Sentence may not start with capital letter',
      severity: ValidationSeverity.WARNING,
    },
    {
      pattern: /\b(their|there|they're)\b/gi,
      message: "Check their/there/they're usage",
      severity: ValidationSeverity.INFO,
    },
    {
      pattern: /\b(your|you're)\b/gi,
      message: "Check your/you're usage",
      severity: ValidationSeverity.INFO,
    },
    {
      pattern: /\b(its|it's)\b/gi,
      message: "Check its/it's usage",
      severity: ValidationSeverity.INFO,
    },
  ];

  validate(text: string): ValidationResult {
    const issues: ValidationIssue[] = [];

    const spellingIssues = this.checkSpelling(text);
    issues.push(...spellingIssues);

    const grammarIssues = this.checkGrammar(text);
    issues.push(...grammarIssues);

    const structureIssues = this.checkStructure(text);
    issues.push(...structureIssues);

    const repetitionIssues = this.checkRepeatedWords(text);
    issues.push(...repetitionIssues);

    return {
      passed:
        issues.filter((i) => i.severity === ValidationSeverity.ERROR).length ===
        0,
      issues,
      metadata: {
        totalIssues: issues.length,
        spellingErrors: spellingIssues.length,
        grammarWarnings: grammarIssues.length,
      },
    };
  }

  private checkSpelling(text: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const words = text.toLowerCase().match(/\b\w+\b/g) ?? [];
    const foundMistakes = new Set<string>();

    words.forEach((word) => {
      if (this.COMMON_MISTAKES[word] && !foundMistakes.has(word)) {
        foundMistakes.add(word);
        issues.push({
          code: 'SPELLING_ERROR',
          message: `Possible spelling mistake: "${word}"`,
          severity: ValidationSeverity.ERROR,
          suggestion: `Did you mean "${this.COMMON_MISTAKES[word]}"?`,
        });
      }
    });

    return issues;
  }

  private checkGrammar(text: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    this.GRAMMAR_PATTERNS.forEach(({ pattern, message, severity }) => {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        // Don't report the same issue multiple times
        const uniqueMessage = `${message} (${matches.length} occurrence${matches.length > 1 ? 's' : ''})`;
        issues.push({
          code: 'GRAMMAR_WARNING',
          message: uniqueMessage,
          severity: severity,
          suggestion: 'Review and correct if necessary',
        });
      }
    });

    return issues;
  }

  private checkStructure(text: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    sentences.forEach((sentence, index) => {
      const words = sentence.trim().split(/\s+/);
      if (words.length > 40) {
        issues.push({
          code: 'LONG_SENTENCE',
          message: `Sentence ${index + 1} is very long (${words.length} words)`,
          severity: ValidationSeverity.INFO,
          suggestion:
            'Consider breaking into shorter sentences for better readability',
        });
      }
    });

    if (sentences.length < 3) {
      issues.push({
        code: 'FEW_SENTENCES',
        message: 'Document contains very few sentences',
        severity: ValidationSeverity.WARNING,
        suggestion:
          'Ensure your CV has sufficient detail and complete sentences',
      });
    }

    return issues;
  }

  private checkRepeatedWords(text: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const repeatedPattern = /\b(\w+)\s+\1\b/gi;
    const matches = text.match(repeatedPattern);

    if (matches && matches.length > 0) {
      issues.push({
        code: 'REPEATED_WORDS',
        message: `Found ${matches.length} repeated word(s)`,
        severity: ValidationSeverity.WARNING,
        suggestion: 'Remove duplicate consecutive words',
      });
    }

    return issues;
  }
}
