import { Injectable, BadRequestException } from '@nestjs/common';
import {
  ValidationResult,
  ValidationIssue,
  ValidationSeverity,
} from '../interfaces';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FileIntegrityValidator {
  private readonly ALLOWED_FILE_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly MIN_FILE_SIZE = 100; // 100 bytes

  async validate(file: Express.Multer.File): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];

    // Check if file exists and is not empty
    if (!file || !file.buffer) {
      issues.push({
        code: 'FILE_MISSING',
        message: 'No file was provided',
        severity: ValidationSeverity.ERROR,
      });
      return { passed: false, issues };
    }

    // Validate file size
    if (file.size === 0 || file.size < this.MIN_FILE_SIZE) {
      issues.push({
        code: 'FILE_EMPTY',
        message: 'The uploaded file is empty or corrupted',
        severity: ValidationSeverity.ERROR,
        suggestion: 'Please upload a valid CV file with content',
      });
    }

    if (file.size > this.MAX_FILE_SIZE) {
      issues.push({
        code: 'FILE_TOO_LARGE',
        message: `File size (${this.formatBytes(file.size)}) exceeds maximum allowed size (${this.formatBytes(this.MAX_FILE_SIZE)})`,
        severity: ValidationSeverity.ERROR,
        suggestion: 'Please compress your CV or reduce its size',
      });
    }

    // Validate file type
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const expectedMimeType = this.getMimeTypeFromExtension(fileExtension);

    if (!this.ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      issues.push({
        code: 'INVALID_FILE_TYPE',
        message: `File type '${file.mimetype}' is not supported`,
        severity: ValidationSeverity.ERROR,
        suggestion: `Supported formats: PDF (.pdf), Word (.docx)`,
      });
    }

    // Check for mime type mismatch
    if (
      expectedMimeType &&
      file.mimetype !== expectedMimeType &&
      this.ALLOWED_FILE_TYPES.includes(file.mimetype)
    ) {
      issues.push({
        code: 'MIMETYPE_MISMATCH',
        message: `File extension '${fileExtension}' does not match mime type '${file.mimetype}'`,
        severity: ValidationSeverity.WARNING,
        suggestion: 'Ensure file extension matches the actual file format',
      });
    }

    // Validate file magic numbers (file signature)
    const isValidSignature = this.validateFileSignature(file.buffer, fileExtension);
    if (!isValidSignature) {
      issues.push({
        code: 'INVALID_FILE_SIGNATURE',
        message: 'File appears to be corrupted or is not a valid document',
        severity: ValidationSeverity.ERROR,
        suggestion:
          'The file signature does not match its extension. Try re-saving the file.',
      });
    }

    return {
      passed: issues.filter((i) => i.severity === ValidationSeverity.ERROR)
        .length === 0,
      issues,
      metadata: {
        fileSize: file.size,
        mimeType: file.mimetype,
        extension: fileExtension,
      },
    };
  }

  private getMimeTypeFromExtension(extension: string): string | null {
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.docx':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    return mimeTypes[extension] || null;
  }

  private validateFileSignature(buffer: Buffer, extension: string): boolean {
    if (extension === '.pdf') {
      // PDF signature: %PDF-
      return buffer.slice(0, 5).toString() === '%PDF-';
    } else if (extension === '.docx') {
      // DOCX is a ZIP file, signature: PK
      return (
        buffer[0] === 0x50 &&
        buffer[1] === 0x4b &&
        (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07)
      );
    }
    return true;
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }
}
