import { Injectable } from '@nestjs/common';
import {
  TextExtractionResult,
  ValidationIssue,
  ValidationSeverity,
} from '../interfaces';
import * as mammoth from 'mammoth';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');

@Injectable()
export class TextExtractionService {
  private readonly MIN_WORD_COUNT = 50;
  private readonly MIN_TEXT_LENGTH = 100;

  async extractText(
    file: Express.Multer.File,
  ): Promise<TextExtractionResult> {
    const issues: ValidationIssue[] = [];
    let extractedText = '';
    let isImageBased = false;

    try {
      if (file.mimetype === 'application/pdf') {
        const result = await this.extractFromPDF(file.buffer);
        extractedText = result.text;
        isImageBased = result.isImageBased;

        if (result.issues) {
          issues.push(...result.issues);
        }
      } else if (
        file.mimetype ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        const result = await this.extractFromDOCX(file.buffer);
        extractedText = result.text;

        if (result.issues) {
          issues.push(...result.issues);
        }
      } else {
        issues.push({
          code: 'UNSUPPORTED_FORMAT',
          message: 'Unsupported file format for text extraction',
          severity: ValidationSeverity.ERROR,
        });
        return {
          passed: false,
          issues,
          extractedText: '',
          wordCount: 0,
          isEmpty: true,
          isImageBased: false,
        };
      }

      // Normalize text
      extractedText = this.normalizeText(extractedText);
      const wordCount = this.countWords(extractedText);
      const isEmpty = extractedText.length < this.MIN_TEXT_LENGTH;

      // Validate extraction quality
      if (isEmpty) {
        issues.push({
          code: 'EMPTY_TEXT',
          message:
            'No text could be extracted from the document or text is too short',
          severity: ValidationSeverity.ERROR,
          suggestion:
            'Ensure the CV contains readable text. Image-based PDFs need to be converted to text.',
        });
      }

      if (isImageBased) {
        issues.push({
          code: 'IMAGE_BASED_PDF',
          message: 'The PDF appears to be image-based (scanned)',
          severity: ValidationSeverity.ERROR,
          suggestion:
            'Convert your CV to a text-based PDF or use OCR to make it ATS-compatible',
        });
      }

      if (wordCount < this.MIN_WORD_COUNT && !isEmpty) {
        issues.push({
          code: 'LOW_WORD_COUNT',
          message: `CV contains only ${wordCount} words, which may be insufficient`,
          severity: ValidationSeverity.WARNING,
          suggestion: `CVs should typically contain at least ${this.MIN_WORD_COUNT} words`,
        });
      }

      return {
        passed: issues.filter((i) => i.severity === ValidationSeverity.ERROR)
          .length === 0,
        issues,
        extractedText,
        wordCount,
        isEmpty,
        isImageBased,
      };
    } catch (error) {
      issues.push({
        code: 'EXTRACTION_FAILED',
        message: `Text extraction failed: ${error.message}`,
        severity: ValidationSeverity.ERROR,
      });

      return {
        passed: false,
        issues,
        extractedText: '',
        wordCount: 0,
        isEmpty: true,
        isImageBased: false,
      };
    }
  }

  private async extractFromPDF(
    buffer: Buffer,
  ): Promise<{ text: string; isImageBased: boolean; issues?: ValidationIssue[] }> {
    try {
      const data = await pdfParse(buffer);
      const text = data.text || '';

      // Detect if PDF is image-based (scanned)
      // If we have pages but very little text, it's likely image-based
      const textPerPage = text.length / (data.numpages || 1);
      const isImageBased = textPerPage < 100 && data.numpages > 0;

      return {
        text,
        isImageBased,
      };
    } catch (error) {
      return {
        text: '',
        isImageBased: false,
        issues: [
          {
            code: 'PDF_PARSE_ERROR',
            message: `Failed to parse PDF: ${error.message}`,
            severity: ValidationSeverity.ERROR,
          },
        ],
      };
    }
  }

  private async extractFromDOCX(
    buffer: Buffer,
  ): Promise<{ text: string; issues?: ValidationIssue[] }> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return {
        text: result.value || '',
        issues: result.messages.map((msg) => ({
          code: 'DOCX_PARSE_WARNING',
          message: msg.message,
          severity: ValidationSeverity.WARNING,
        })),
      };
    } catch (error) {
      return {
        text: '',
        issues: [
          {
            code: 'DOCX_PARSE_ERROR',
            message: `Failed to parse DOCX: ${error.message}`,
            severity: ValidationSeverity.ERROR,
          },
        ],
      };
    }
  }

  private normalizeText(text: string): string {
    return text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
      .replace(/[ \t]+/g, ' ') // Normalize spaces
      .trim();
  }

  private countWords(text: string): number {
    return text
      .split(/\s+/)
      .filter((word) => word.length > 0)
      .length;
  }
}
