/**
 * TextExtractionService Tests
 *
 * NOTA (Uncle Bob): Testes focam em comportamento observável.
 * Como depende de libs externas (pdf-parse, mammoth), mockamos.
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { TextExtractionService } from './text-extraction.service';
import { ValidationSeverity } from '../interfaces';

// Mock pdf-parse and mammoth
// TODO: Bun native mock - jest.mock('pdf-parse', () => {
  return mock().mockImplementation((buffer: Buffer) => {
    // Check buffer content to determine mock response
    const bufferStr = buffer.toString();
    if (bufferStr.includes('error')) {
      return Promise.reject(new Error('PDF parse error'));
    }
    if (bufferStr.includes('image')) {
      return Promise.resolve({ text: 'short', numpages: 5 }); // Image-based
    }
    return Promise.resolve({
      text: 'This is a sample resume with enough words to pass validation. It contains experience, education, skills, and other relevant information that makes a complete CV document.',
      numpages: 1,
    });
  });
});

// TODO: Bun native mock - jest.mock('mammoth', () => ({
  extractRawText: jest
    .fn()
    .mockImplementation(({ buffer }: { buffer: Buffer }) => {
      const bufferStr = buffer.toString();
      if (bufferStr.includes('error')) {
        return Promise.reject(new Error('DOCX parse error'));
      }
      return Promise.resolve({
        value:
          'This is a sample resume extracted from DOCX with enough words to pass validation. It contains experience, education, skills, and other relevant information.',
        messages: [],
      });
    }),
}));

describe('TextExtractionService', () => {
  let service: TextExtractionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TextExtractionService],
    }).compile();

    service = module.get<TextExtractionService>(TextExtractionService);
  });

  describe('extractText', () => {
    describe('PDF files', () => {
      it('should extract text from valid PDF', async () => {
        const file = {
          mimetype: 'application/pdf',
          buffer: Buffer.from('valid pdf content'),
        } as Express.Multer.File;

        const result = await service.extractText(file);

        expect(result.passed).toBe(true);
        expect(result.extractedText).toBeDefined();
        expect(result.wordCount).toBeGreaterThan(0);
        expect(result.isEmpty).toBe(false);
      });

      it('should detect image-based PDFs', async () => {
        const file = {
          mimetype: 'application/pdf',
          buffer: Buffer.from('image based pdf'),
        } as Express.Multer.File;

        const result = await service.extractText(file);

        expect(result.isImageBased).toBe(true);
        expect(result.issues).toContainEqual(
          expect.objectContaining({
            code: 'IMAGE_BASED_PDF',
            severity: ValidationSeverity.ERROR,
          }),
        );
      });

      it('should handle PDF parse errors', async () => {
        const file = {
          mimetype: 'application/pdf',
          buffer: Buffer.from('error content'),
        } as Express.Multer.File;

        const result = await service.extractText(file);

        expect(result.passed).toBe(false);
        expect(result.issues).toContainEqual(
          expect.objectContaining({
            code: 'PDF_PARSE_ERROR',
          }),
        );
      });
    });

    describe('DOCX files', () => {
      it('should extract text from valid DOCX', async () => {
        const file = {
          mimetype:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          buffer: Buffer.from('valid docx content'),
        } as Express.Multer.File;

        const result = await service.extractText(file);

        expect(result.passed).toBe(true);
        expect(result.extractedText).toBeDefined();
        expect(result.wordCount).toBeGreaterThan(0);
      });

      it('should handle DOCX parse errors', async () => {
        const file = {
          mimetype:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          buffer: Buffer.from('error content'),
        } as Express.Multer.File;

        const result = await service.extractText(file);

        expect(result.passed).toBe(false);
        expect(result.issues).toContainEqual(
          expect.objectContaining({
            code: 'DOCX_PARSE_ERROR',
          }),
        );
      });
    });

    describe('unsupported formats', () => {
      it('should reject unsupported file formats', async () => {
        const file = {
          mimetype: 'text/plain',
          buffer: Buffer.from('plain text'),
        } as Express.Multer.File;

        const result = await service.extractText(file);

        expect(result.passed).toBe(false);
        expect(result.issues).toContainEqual(
          expect.objectContaining({
            code: 'UNSUPPORTED_FORMAT',
            severity: ValidationSeverity.ERROR,
          }),
        );
      });
    });

    describe('validation', () => {
      it('should include word count in result', async () => {
        const file = {
          mimetype: 'application/pdf',
          buffer: Buffer.from('valid pdf'),
        } as Express.Multer.File;

        const result = await service.extractText(file);

        expect(typeof result.wordCount).toBe('number');
      });

      it('should indicate if text is empty', async () => {
        const file = {
          mimetype: 'application/pdf',
          buffer: Buffer.from('valid pdf'),
        } as Express.Multer.File;

        const result = await service.extractText(file);

        expect(typeof result.isEmpty).toBe('boolean');
      });
    });
  });
});
