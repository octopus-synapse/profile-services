import { Injectable } from '@nestjs/common';
import { FileIntegrityValidator } from '../validators/file-integrity.validator';
import { TextExtractionService } from './text-extraction.service';
import { EncodingNormalizerService } from './encoding-normalizer.service';
import { CVSectionParser } from '../parsers/cv-section.parser';
import { FormatValidator } from '../validators/format.validator';
import { SectionOrderValidator } from '../validators/section-order.validator';
import { LayoutSafetyValidator } from '../validators/layout-safety.validator';
import { GrammarValidator } from '../validators/grammar.validator';
import type { Validation, ValidateCV, ValidationIssue } from '@/shared-kernel';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import type {
  TextExtractionResult,
  ValidationResult,
  ValidationIssue as InternalValidationIssue,
  ValidationSeverity,
} from '../interfaces';

@Injectable()
export class ATSService {
  constructor(
    private readonly fileIntegrityValidator: FileIntegrityValidator,
    private readonly textExtractionService: TextExtractionService,
    private readonly encodingNormalizer: EncodingNormalizerService,
    private readonly cvSectionParser: CVSectionParser,
    private readonly formatValidator: FormatValidator,
    private readonly sectionOrderValidator: SectionOrderValidator,
    private readonly layoutSafetyValidator: LayoutSafetyValidator,
    private readonly grammarValidator: GrammarValidator,
    private readonly logger: AppLoggerService,
  ) {}

  async validateCV(
    file: Express.Multer.File,
    options: ValidateCV = {},
  ): Promise<Validation> {
    this.logger.log('Starting CV validation', 'ATSService', {
      fileName: file.originalname,
      fileSize: file.size,
    });

    const results: Record<string, ValidationResult> = {};

    // Step 1: Validate file integrity (always run)
    this.logger.log('Validating file integrity', 'ATSService');
    results.fileIntegrity = this.fileIntegrityValidator.validate(file);

    if (!results.fileIntegrity.passed) {
      this.logger.warn('File integrity check failed', 'ATSService');
      return this.buildValidationResponse(results, file);
    }

    // Step 2: Extract text (always run)
    this.logger.log('Extracting text from document', 'ATSService');
    results.textExtraction = await this.textExtractionService.extractText(file);

    if (!results.textExtraction.passed) {
      this.logger.warn('Text extraction failed', 'ATSService');
      return this.buildValidationResponse(results, file);
    }

    const extractedText = (results.textExtraction as TextExtractionResult)
      .extractedText;

    // Step 3: Normalize encoding (always run)
    this.logger.log('Normalizing text encoding', 'ATSService');
    const normalizationResult =
      this.encodingNormalizer.normalizeText(extractedText);
    results.encoding = normalizationResult.result;
    const normalizedText = normalizationResult.normalizedText;

    // Step 4: Parse CV sections (always run if checkSections is enabled)
    if (options.checkSections !== false) {
      this.logger.log('Parsing CV sections', 'ATSService');
      const parsedCV = this.cvSectionParser.parseCV(
        normalizedText,
        file.originalname,
        file.mimetype,
      );

      results.sectionParsing = this.cvSectionParser.validateSections(parsedCV);

      // Step 5: Validate mandatory sections
      this.logger.log('Validating mandatory sections', 'ATSService');
      results.mandatorySections = results.sectionParsing; // Already includes mandatory section checks

      // Step 6: Check section order
      if (options.checkOrder !== false) {
        this.logger.log('Checking section order', 'ATSService');
        results.sectionOrder = this.sectionOrderValidator.validate(parsedCV);
      }
    }

    // Step 7: Validate format (if enabled)
    if (options.checkFormat !== false) {
      this.logger.log('Validating document format', 'ATSService');
      results.formatValidation = this.formatValidator.validate(
        file,
        normalizedText,
      );
    }

    // Step 8: Check layout safety (if enabled)
    if (options.checkLayout !== false) {
      this.logger.log('Checking layout safety', 'ATSService');
      results.layout = this.layoutSafetyValidator.validate(normalizedText);
    }

    // Step 9: Grammar and spelling check (if enabled)
    if (options.checkGrammar === true) {
      this.logger.log('Checking grammar and spelling', 'ATSService');
      results.grammar = this.grammarValidator.validate(normalizedText);
    }

    const allResults = Object.values(results).filter(Boolean);
    const totalIssues = allResults.reduce((sum, r) => sum + r.issues.length, 0);

    this.logger.log('CV validation completed', 'ATSService', {
      passed: results.fileIntegrity.passed,
      totalIssues,
    });

    return this.buildValidationResponse(results, file);
  }

  private buildValidationResponse(
    results: Record<string, ValidationResult>,
    file: Express.Multer.File,
  ): Validation {
    const allResults = Object.values(results).filter(Boolean);
    const allIssues = allResults.flatMap((r) => r.issues);
    const allPassed = allResults.every((r) => r.passed);
    const score = allPassed ? 100 : Math.max(0, 100 - allIssues.length * 5);

    return {
      isValid: allPassed,
      score,
      issues: this.mapIssuesToContract(allIssues),
      suggestions: [],
      metadata: {
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        analyzedAt: new Date().toISOString(),
      },
    };
  }

  private mapIssuesToContract(
    issues: InternalValidationIssue[],
  ): ValidationIssue[] {
    const severityToType: Record<
      ValidationSeverity,
      'error' | 'warning' | 'suggestion'
    > = {
      error: 'error',
      warning: 'warning',
      info: 'suggestion',
    };

    return issues.map((issue) => ({
      type: severityToType[issue.severity],
      severity: severityToType[issue.severity],
      category: issue.code,
      message: issue.message,
      location: issue.location,
    }));
  }
}
