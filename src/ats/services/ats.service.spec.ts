/**
 * ATSService Tests
 *
 * Behavioral tests for CV validation pipeline.
 * Focus: What validation results are returned for different CV inputs.
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { ATSService } from './ats.service';
import { FileIntegrityValidator } from '../validators/file-integrity.validator';
import { TextExtractionService } from './text-extraction.service';
import { EncodingNormalizerService } from './encoding-normalizer.service';
import { CVSectionParser } from '../parsers/cv-section.parser';
import { FormatValidator } from '../validators/format.validator';
import { SectionOrderValidator } from '../validators/section-order.validator';
import { LayoutSafetyValidator } from '../validators/layout-safety.validator';
import { GrammarValidator } from '../validators/grammar.validator';
import { AppLoggerService } from '../../common/logger/logger.service';
import { ValidationSeverity } from '../interfaces';

describe('ATSService', () => {
  let service: ATSService;

  const createMockFile = (
    overrides: Partial<Express.Multer.File> = {},
  ): Express.Multer.File =>
    ({
      originalname: 'resume.pdf',
      mimetype: 'application/pdf',
      size: 1024 * 100, // 100KB
      buffer: Buffer.from('mock file content'),
      ...overrides,
    }) as Express.Multer.File;

  const mockFileIntegrityValidator = {
    validate: mock(),
  };

  const mockTextExtractionService = {
    extractText: mock(),
  };

  const mockEncodingNormalizer = {
    normalizeText: mock(),
  };

  const mockCvSectionParser = {
    parseCV: mock(),
    validateSections: mock(),
  };

  const mockFormatValidator = {
    validate: mock(),
  };

  const mockSectionOrderValidator = {
    validate: mock(),
  };

  const mockLayoutSafetyValidator = {
    validate: mock(),
  };

  const mockGrammarValidator = {
    validate: mock(),
  };

  const mockLogger = {
    log: mock(),
    warn: mock(),
    error: mock(),
    debug: mock(),
  };

  beforeEach(async () => {const module: TestingModule = await Test.createTestingModule({
      providers: [
        ATSService,
        {
          provide: FileIntegrityValidator,
          useValue: mockFileIntegrityValidator,
        },
        { provide: TextExtractionService, useValue: mockTextExtractionService },
        {
          provide: EncodingNormalizerService,
          useValue: mockEncodingNormalizer,
        },
        { provide: CVSectionParser, useValue: mockCvSectionParser },
        { provide: FormatValidator, useValue: mockFormatValidator },
        { provide: SectionOrderValidator, useValue: mockSectionOrderValidator },
        { provide: LayoutSafetyValidator, useValue: mockLayoutSafetyValidator },
        { provide: GrammarValidator, useValue: mockGrammarValidator },
        { provide: AppLoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<ATSService>(ATSService);
  });

  const setupSuccessfulPipeline = () => {
    mockFileIntegrityValidator.validate.mockReturnValue({
      passed: true,
      issues: [],
    });

    mockTextExtractionService.extractText.mockResolvedValue({
      passed: true,
      issues: [],
      extractedText: 'Sample CV text\nExperience\nSoftware Engineer',
    });

    mockEncodingNormalizer.normalizeText.mockReturnValue({
      result: { passed: true, issues: [] },
      normalizedText: 'Sample CV text\nExperience\nSoftware Engineer',
    });

    mockCvSectionParser.parseCV.mockReturnValue({
      sections: [{ type: 'EXPERIENCE', content: 'Software Engineer' }],
      rawText: 'Sample CV text',
      metadata: {},
    });

    mockCvSectionParser.validateSections.mockReturnValue({
      passed: true,
      issues: [],
      detectedSections: ['EXPERIENCE'],
      missingSections: [],
      metadata: { totalSections: 1, uniqueSections: 1 },
    });

    mockFormatValidator.validate.mockReturnValue({
      passed: true,
      issues: [],
    });

    mockSectionOrderValidator.validate.mockReturnValue({
      passed: true,
      issues: [],
    });

    mockLayoutSafetyValidator.validate.mockReturnValue({
      passed: true,
      issues: [],
    });

    mockGrammarValidator.validate.mockReturnValue({
      passed: true,
      issues: [],
    });
  };

  describe('validateCV', () => {
    it('should return successful validation for valid CV', async () => {
      setupSuccessfulPipeline();
      const file = createMockFile();

      const result = await service.validateCV(file);

      expect(result.results.fileIntegrity?.passed).toBe(true);
      expect(result.results.textExtraction?.passed).toBe(true);
    });

    it('should stop validation early when file integrity fails', async () => {
      mockFileIntegrityValidator.validate.mockReturnValue({
        passed: false,
        issues: [
          {
            code: 'INVALID_FILE_TYPE',
            message: 'File type not supported',
            severity: ValidationSeverity.ERROR,
          },
        ],
      });

      const file = createMockFile({ mimetype: 'image/png' });
      const result = await service.validateCV(file);

      expect(result.results.fileIntegrity?.passed).toBe(false);
      expect(mockTextExtractionService.extractText).not.toHaveBeenCalled();
    });

    it('should stop validation early when text extraction fails', async () => {
      mockFileIntegrityValidator.validate.mockReturnValue({
        passed: true,
        issues: [],
      });

      mockTextExtractionService.extractText.mockResolvedValue({
        passed: false,
        issues: [
          {
            code: 'EXTRACTION_FAILED',
            message: 'Could not extract text from document',
            severity: ValidationSeverity.ERROR,
          },
        ],
      });

      const file = createMockFile();
      const result = await service.validateCV(file);

      expect(result.results.textExtraction?.passed).toBe(false);
      expect(mockEncodingNormalizer.normalizeText).not.toHaveBeenCalled();
    });

    it('should skip section checks when checkSections is false', async () => {
      setupSuccessfulPipeline();
      const file = createMockFile();

      await service.validateCV(file, { checkSections: false });

      expect(mockCvSectionParser.parseCV).not.toHaveBeenCalled();
      expect(mockCvSectionParser.validateSections).not.toHaveBeenCalled();
    });

    it('should skip format validation when checkFormat is false', async () => {
      setupSuccessfulPipeline();
      const file = createMockFile();

      await service.validateCV(file, { checkFormat: false });

      expect(mockFormatValidator.validate).not.toHaveBeenCalled();
    });

    it('should skip layout check when checkLayout is false', async () => {
      setupSuccessfulPipeline();
      const file = createMockFile();

      await service.validateCV(file, { checkLayout: false });

      expect(mockLayoutSafetyValidator.validate).not.toHaveBeenCalled();
    });

    it('should skip grammar check by default', async () => {
      setupSuccessfulPipeline();
      const file = createMockFile();

      await service.validateCV(file);

      expect(mockGrammarValidator.validate).not.toHaveBeenCalled();
    });

    it('should include grammar check when checkGrammar is true', async () => {
      setupSuccessfulPipeline();
      const file = createMockFile();

      await service.validateCV(file, { checkGrammar: true });

      expect(mockGrammarValidator.validate).toHaveBeenCalled();
    });

    it('should skip section order check when checkOrder is false', async () => {
      setupSuccessfulPipeline();
      const file = createMockFile();

      await service.validateCV(file, { checkOrder: false });

      expect(mockSectionOrderValidator.validate).not.toHaveBeenCalled();
    });

    it('should log validation progress', async () => {
      setupSuccessfulPipeline();
      const file = createMockFile();

      await service.validateCV(file);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Starting CV validation',
        'ATSService',
        expect.objectContaining({
          fileName: 'resume.pdf',
          fileSize: expect.any(Number),
        }),
      );
    });

    it('should log warning when file integrity fails', async () => {
      mockFileIntegrityValidator.validate.mockReturnValue({
        passed: false,
        issues: [
          {
            code: 'ERROR',
            message: 'Failed',
            severity: ValidationSeverity.ERROR,
          },
        ],
      });

      const file = createMockFile();
      await service.validateCV(file);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'File integrity check failed',
        'ATSService',
      );
    });

    it('should normalize text encoding before validation', async () => {
      setupSuccessfulPipeline();
      const file = createMockFile();

      await service.validateCV(file);

      expect(mockEncodingNormalizer.normalizeText).toHaveBeenCalled();
    });

    it('should pass normalized text to section parser', async () => {
      const extractedText = 'Raw text from document';
      const normalizedText = 'Normalized text';

      mockFileIntegrityValidator.validate.mockReturnValue({
        passed: true,
        issues: [],
      });
      mockTextExtractionService.extractText.mockResolvedValue({
        passed: true,
        issues: [],
        extractedText,
      });
      mockEncodingNormalizer.normalizeText.mockReturnValue({
        result: { passed: true, issues: [] },
        normalizedText,
      });
      mockCvSectionParser.parseCV.mockReturnValue({
        sections: [],
        rawText: normalizedText,
        metadata: {},
      });
      mockCvSectionParser.validateSections.mockReturnValue({
        passed: true,
        issues: [],
        detectedSections: [],
        missingSections: [],
        metadata: {},
      });
      mockFormatValidator.validate.mockReturnValue({
        passed: true,
        issues: [],
      });
      mockLayoutSafetyValidator.validate.mockReturnValue({
        passed: true,
        issues: [],
      });
      mockSectionOrderValidator.validate.mockReturnValue({
        passed: true,
        issues: [],
      });

      const file = createMockFile();
      await service.validateCV(file);

      expect(mockCvSectionParser.parseCV).toHaveBeenCalledWith(
        normalizedText,
        file.originalname,
        file.mimetype,
      );
    });

    it('should include all enabled validation results in response', async () => {
      setupSuccessfulPipeline();
      const file = createMockFile();

      const result = await service.validateCV(file, { checkGrammar: true });

      expect(result.results.fileIntegrity).toBeDefined();
      expect(result.results.textExtraction).toBeDefined();
      expect(result.results.encoding).toBeDefined();
      expect(result.results.sectionParsing).toBeDefined();
      expect(result.results.formatValidation).toBeDefined();
      expect(result.results.layout).toBeDefined();
      expect(result.results.grammar).toBeDefined();
    });
  });

  describe('validation pipeline behavior', () => {
    it('should aggregate issues from all validators', async () => {
      mockFileIntegrityValidator.validate.mockReturnValue({
        passed: true,
        issues: [
          {
            code: 'WARNING1',
            message: 'File warning',
            severity: ValidationSeverity.WARNING,
          },
        ],
      });

      mockTextExtractionService.extractText.mockResolvedValue({
        passed: true,
        issues: [],
        extractedText: 'Text content',
      });

      mockEncodingNormalizer.normalizeText.mockReturnValue({
        result: {
          passed: true,
          issues: [
            {
              code: 'ENCODING_ISSUE',
              message: 'Minor encoding issue',
              severity: ValidationSeverity.INFO,
            },
          ],
        },
        normalizedText: 'Normalized text',
      });

      mockCvSectionParser.parseCV.mockReturnValue({
        sections: [],
        rawText: 'text',
        metadata: {},
      });

      mockCvSectionParser.validateSections.mockReturnValue({
        passed: false,
        issues: [
          {
            code: 'MISSING_SECTIONS',
            message: 'Missing sections',
            severity: ValidationSeverity.ERROR,
          },
        ],
        detectedSections: [],
        missingSections: ['EXPERIENCE'],
        metadata: {},
      });

      mockFormatValidator.validate.mockReturnValue({
        passed: true,
        issues: [],
      });
      mockLayoutSafetyValidator.validate.mockReturnValue({
        passed: true,
        issues: [],
      });
      mockSectionOrderValidator.validate.mockReturnValue({
        passed: true,
        issues: [],
      });

      const file = createMockFile();
      const result = await service.validateCV(file);

      // Check that issues from different validators are present
      expect(result.results.fileIntegrity?.issues).toHaveLength(1);
      expect(result.results.encoding?.issues).toHaveLength(1);
      expect(result.results.sectionParsing?.issues).toHaveLength(1);
    });

    it('should handle file with all validation issues', async () => {
      mockFileIntegrityValidator.validate.mockReturnValue({
        passed: true,
        issues: [
          {
            code: 'SIZE_WARNING',
            message: 'Large file',
            severity: ValidationSeverity.WARNING,
          },
        ],
      });

      mockTextExtractionService.extractText.mockResolvedValue({
        passed: true,
        issues: [
          {
            code: 'PARTIAL_EXTRACTION',
            message: 'Some text might be missing',
            severity: ValidationSeverity.WARNING,
          },
        ],
        extractedText: 'Partial text',
      });

      mockEncodingNormalizer.normalizeText.mockReturnValue({
        result: { passed: true, issues: [] },
        normalizedText: 'Partial text',
      });

      mockCvSectionParser.parseCV.mockReturnValue({
        sections: [{ type: 'SKILLS', content: 'JavaScript' }],
        rawText: 'text',
        metadata: {},
      });

      mockCvSectionParser.validateSections.mockReturnValue({
        passed: false,
        issues: [
          {
            code: 'MISSING_EXPERIENCE',
            message: 'No experience section',
            severity: ValidationSeverity.ERROR,
          },
          {
            code: 'MISSING_EDUCATION',
            message: 'No education section',
            severity: ValidationSeverity.ERROR,
          },
        ],
        detectedSections: ['SKILLS'],
        missingSections: ['EXPERIENCE', 'EDUCATION'],
        metadata: { totalSections: 1, uniqueSections: 1 },
      });

      mockFormatValidator.validate.mockReturnValue({
        passed: true,
        issues: [
          {
            code: 'FONT_WARNING',
            message: 'Unusual font detected',
            severity: ValidationSeverity.WARNING,
          },
        ],
      });

      mockLayoutSafetyValidator.validate.mockReturnValue({
        passed: true,
        issues: [
          {
            code: 'COMPLEX_LAYOUT',
            message: 'Complex layout may affect parsing',
            severity: ValidationSeverity.WARNING,
          },
        ],
      });

      mockSectionOrderValidator.validate.mockReturnValue({
        passed: true,
        issues: [],
      });

      const file = createMockFile();
      const result = await service.validateCV(file);

      // Validation should complete with multiple issues aggregated
      expect(result.results.fileIntegrity?.issues.length).toBeGreaterThan(0);
      expect(result.results.sectionParsing?.issues.length).toBe(2);
    });
  });
});
