/**
 * Input Validation Security Tests
 *
 * Validates that all API endpoints properly validate and sanitize input.
 * Tests for common input validation vulnerabilities.
 */

import { describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
import {
  fileExists,
  grepCodebase,
  grepCodebaseFixed,
  readAllTsFiles,
  SRC_DIR,
} from './security-utils';

describe('Input Validation Security Tests', () => {
  describe('DTO Validation', () => {
    it('should have DTOs using Zod or class-validator', () => {
      const dtoFiles = readAllTsFiles(SRC_DIR).filter((f) => f.includes('.dto.ts'));

      // Should have DTOs defined
      expect(dtoFiles.length).toBeGreaterThan(10);

      let hasValidation = false;
      for (const file of dtoFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        if (
          content.includes('createZodDto') ||
          content.includes('@IsString') ||
          content.includes('@IsEmail') ||
          content.includes('z.string') ||
          content.includes('z.object')
        ) {
          hasValidation = true;
          break;
        }
      }

      expect(hasValidation).toBe(true);
    });

    it('should use Zod schemas for request validation', () => {
      const zodUsage = grepCodebaseFixed('createZodDto', ['node_modules', 'dist']);
      expect(zodUsage.length).toBeGreaterThan(0);
    });

    it('should validate email format', () => {
      const emailFields = grepCodebase('email', ['node_modules', 'dist']);
      let hasEmailValidation = false;

      for (const file of emailFields) {
        const [filePath] = file.split(':');
        if (!filePath || !fileExists(filePath)) continue;
        if (!filePath.includes('.dto.ts') && !filePath.includes('.schema.ts')) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        if (
          content.includes('@IsEmail') ||
          content.includes('EmailSchema') ||
          content.includes('.email()') ||
          content.includes('z.string().email')
        ) {
          hasEmailValidation = true;
        }
      }

      expect(hasEmailValidation).toBe(true);
    });

    it('should validate ID format (UUID or CUID)', () => {
      const idParams = grepCodebase('@Param|:id', ['node_modules', 'dist']);
      let hasIdValidation = false;

      for (const file of idParams) {
        const [filePath] = file.split(':');
        if (!filePath || !fileExists(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // Check for various ID validation patterns
        if (
          content.includes('@IsUUID') ||
          content.includes('ParseUUIDPipe') ||
          content.includes('ParseCuidPipe') ||
          content.includes('CuidSchema') ||
          content.includes('.cuid()') ||
          content.includes('.uuid()') ||
          content.includes('IdSchema')
        ) {
          hasIdValidation = true;
        }
      }

      expect(hasIdValidation).toBe(true);
    });
  });

  describe('String Input Sanitization', () => {
    it('should limit string lengths', () => {
      const stringFields = grepCodebaseFixed('string', ['node_modules', 'dist']);
      let hasLengthLimits = false;

      for (const file of stringFields) {
        const [filePath] = file.split(':');
        if (!filePath || !fileExists(filePath)) continue;
        if (!filePath.includes('.dto.ts') && !filePath.includes('.schema.ts')) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        if (
          content.includes('@MaxLength') ||
          content.includes('@Length') ||
          content.includes('.max(') ||
          content.includes('maxLength')
        ) {
          hasLengthLimits = true;
        }
      }

      expect(hasLengthLimits).toBe(true);
    });

    it('should not accept raw HTML in text inputs (or sanitize if needed)', () => {
      // This test checks that HTML handling is done safely
      // Most API endpoints don't need HTML - they use plain text or markdown

      // Check if there are any endpoints explicitly handling HTML content
      const htmlHandling = grepCodebaseFixed('innerHTML', ['node_modules', 'dist', 'test']);
      const controllersWithHtml = htmlHandling.filter(
        (h) =>
          h.includes('.controller.ts') &&
          !h.includes('export/') && // Export uses controlled HTML for PDF generation
          !h.includes('puppeteer'),
      );

      // Controllers should not directly manipulate innerHTML
      expect(controllersWithHtml).toEqual([]);
    });
  });

  describe('Numeric Input Validation', () => {
    it('should validate numeric ranges', () => {
      const numericFields = grepCodebase('@IsNumber|@IsInt|number', ['node_modules', 'dist']);
      let hasRangeValidation = false;

      for (const file of numericFields) {
        const [filePath] = file.split(':');
        if (!filePath || !fileExists(filePath)) continue;
        if (!filePath.includes('.dto.ts') && !filePath.includes('.schema.ts')) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        if (
          content.includes('@Min') ||
          content.includes('@Max') ||
          content.includes('.min(') ||
          content.includes('.max(') ||
          content.includes('@IsPositive')
        ) {
          hasRangeValidation = true;
        }
      }

      expect(hasRangeValidation).toBe(true);
    });

    it('should validate pagination parameters', () => {
      const paginationFiles = grepCodebase('page|limit|offset|skip|take', ['node_modules', 'dist']);
      let hasPaginationLimits = false;

      for (const file of paginationFiles) {
        const [filePath] = file.split(':');
        if (!filePath || !fileExists(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // Check for pagination limits
        if (
          content.includes('Math.min') ||
          content.includes('MAX_LIMIT') ||
          content.includes('maxLimit') ||
          (content.includes('limit') && content.includes('@Max')) ||
          (content.includes('take') && content.includes('.max('))
        ) {
          hasPaginationLimits = true;
        }
      }

      expect(hasPaginationLimits).toBe(true);
    });
  });

  describe('Array Input Validation', () => {
    it('should limit array sizes', () => {
      const arrayFields = grepCodebase('@IsArray|array\\(', ['node_modules', 'dist']);
      let hasArrayLimits = false;

      for (const file of arrayFields) {
        const [filePath] = file.split(':');
        if (!filePath || !fileExists(filePath)) continue;
        if (!filePath.includes('.dto.ts') && !filePath.includes('.schema.ts')) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        if (
          content.includes('@ArrayMaxSize') ||
          content.includes('@ArrayMinSize') ||
          content.includes('.max(') ||
          content.includes('maxItems') ||
          content.includes('.length(')
        ) {
          hasArrayLimits = true;
        }
      }

      // Should have array size limits
      expect(hasArrayLimits).toBe(true);
    });

    it('should validate array elements', () => {
      const arrayFields = grepCodebase('@IsArray|z.array', ['node_modules', 'dist']);
      let hasElementValidation = false;

      for (const file of arrayFields) {
        const [filePath] = file.split(':');
        if (!filePath || !fileExists(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        if (
          content.includes('@ValidateNested') ||
          content.includes('@Type') ||
          content.includes('@ArrayUnique') ||
          content.includes('.array(z.')
        ) {
          hasElementValidation = true;
        }
      }

      expect(hasElementValidation).toBe(true);
    });
  });

  describe('File Upload Validation', () => {
    it('should validate file types', () => {
      // Check for file type validation in upload service or controller
      const uploadFiles = readAllTsFiles(SRC_DIR).filter(
        (f) => f.includes('upload') && (f.includes('.service.ts') || f.includes('.controller.ts')),
      );

      let hasTypeValidation = false;

      for (const file of uploadFiles) {
        const content = fs.readFileSync(file, 'utf-8');

        // Check for file type validation patterns
        if (
          content.includes('mimetype') ||
          content.includes('allowedMimeTypes') ||
          content.includes('fileFilter') ||
          content.includes('FileTypeValidator') ||
          content.includes('ParseFilePipe') ||
          content.includes('validateFile')
        ) {
          hasTypeValidation = true;
        }
      }

      expect(hasTypeValidation).toBe(true);
    });

    it('should limit file sizes', () => {
      // Check for file size limits in upload service or controller
      const uploadFiles = readAllTsFiles(SRC_DIR).filter(
        (f) => f.includes('upload') && (f.includes('.service.ts') || f.includes('.controller.ts')),
      );

      let hasSizeLimit = false;

      for (const file of uploadFiles) {
        const content = fs.readFileSync(file, 'utf-8');

        // Check for file size limit patterns
        if (
          content.includes('maxFileSize') ||
          content.includes('maxSize') ||
          content.includes('fileSize') ||
          content.includes('limits') ||
          content.includes('size >') ||
          content.includes('MaxFileSizeValidator')
        ) {
          hasSizeLimit = true;
        }
      }

      expect(hasSizeLimit).toBe(true);
    });
  });

  describe('Query Parameter Validation', () => {
    it('should validate query parameters', () => {
      const queryParams = grepCodebaseFixed('@Query', ['node_modules', 'dist']);
      let hasQueryValidation = false;

      for (const file of queryParams) {
        const [filePath] = file.split(':');
        if (!filePath || !fileExists(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // Check for query validation via Pipes or DTOs
        if (
          content.includes('ValidationPipe') ||
          content.includes('ParseIntPipe') ||
          content.includes('ParseBoolPipe') ||
          content.includes('QueryDto') ||
          content.includes('ZodValidationPipe')
        ) {
          hasQueryValidation = true;
        }
      }

      expect(hasQueryValidation).toBe(true);
    });

    it('should validate sort/filter parameters to prevent injection', () => {
      // Check for direct user input used as dynamic property access in database queries
      const repositoryFiles = readAllTsFiles(SRC_DIR).filter((f) => f.includes('.repository.ts'));
      const unsafePatterns: string[] = [];

      for (const file of repositoryFiles) {
        const content = fs.readFileSync(file, 'utf-8');

        // Check for direct property access with user input in orderBy
        // Pattern: orderBy: { [someVar]: ... }
        if (content.match(/orderBy:\s*\{\s*\[\w+\]:/)) {
          // Should have validation nearby
          const hasValidation =
            content.includes('enum') ||
            content.includes('Enum') ||
            content.includes('allowedFields') ||
            content.includes('validFields') ||
            content.includes('Object.keys') ||
            content.includes('includes(');

          if (!hasValidation) {
            unsafePatterns.push(file);
          }
        }
      }

      // Repository files with dynamic orderBy should validate inputs
      expect(unsafePatterns).toEqual([]);
    });
  });

  describe('Date Input Validation', () => {
    it('should validate date formats', () => {
      const dateFields = grepCodebase('@IsDate|Date|date', ['node_modules', 'dist']);
      let hasDateValidation = false;

      for (const file of dateFields) {
        const [filePath] = file.split(':');
        if (!filePath || !fileExists(filePath)) continue;
        if (!filePath.includes('.dto.ts') && !filePath.includes('.schema.ts')) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        if (
          content.includes('@IsDate') ||
          content.includes('@IsDateString') ||
          content.includes('@Type(() => Date)') ||
          content.includes('z.date()') ||
          content.includes('.datetime()') ||
          content.includes('z.coerce.date')
        ) {
          hasDateValidation = true;
        }
      }

      expect(hasDateValidation).toBe(true);
    });
  });

  describe('Enum Validation', () => {
    it('should validate enum values', () => {
      const enumFields = grepCodebase('@IsEnum|z.enum|nativeEnum', ['node_modules', 'dist']);
      let hasEnumValidation = false;

      for (const file of enumFields) {
        const [filePath] = file.split(':');
        if (!filePath || !fileExists(filePath)) continue;
        if (!filePath.includes('.dto.ts') && !filePath.includes('.schema.ts')) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        if (
          content.includes('@IsEnum') ||
          content.includes('z.enum') ||
          content.includes('.nativeEnum(')
        ) {
          hasEnumValidation = true;
        }
      }

      expect(hasEnumValidation).toBe(true);
    });
  });

  describe('Nested Object Validation', () => {
    it('should validate nested objects', () => {
      const nestedObjects = grepCodebase('@ValidateNested|z.object', ['node_modules', 'dist']);
      let hasNestedValidation = false;

      for (const file of nestedObjects) {
        const [filePath] = file.split(':');
        if (!filePath || !fileExists(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        if (
          content.includes('@ValidateNested') ||
          content.includes('z.object') ||
          content.includes('@Type(')
        ) {
          hasNestedValidation = true;
        }
      }

      expect(hasNestedValidation).toBe(true);
    });
  });

  describe('Global Validation Configuration', () => {
    it('should have global validation pipe configured', () => {
      // Validation may be in main.ts or a config module
      const validationUsage = grepCodebase(
        'ValidationPipe|ZodValidationPipe|useGlobalPipes|configureValidation',
        ['node_modules', 'dist', 'test'],
      );

      expect(validationUsage.length).toBeGreaterThan(0);
    });

    it('should use Zod or class-validator for input validation', () => {
      // Check that DTOs use validation schemas
      const dtoFiles = readAllTsFiles(SRC_DIR).filter((f) => f.includes('.dto.ts'));

      let hasSchemaValidation = false;

      for (const file of dtoFiles) {
        const content = fs.readFileSync(file, 'utf-8');

        if (
          content.includes('createZodDto') ||
          content.includes('z.object') ||
          content.includes('@IsString') ||
          content.includes('@IsNumber') ||
          content.includes('@IsEmail')
        ) {
          hasSchemaValidation = true;
          break;
        }
      }

      expect(hasSchemaValidation).toBe(true);
    });
  });
});
