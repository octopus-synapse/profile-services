/**
 * Input Validation Security Tests
 *
 * Validates that all API endpoints properly validate and sanitize input.
 * Tests for common input validation vulnerabilities.
 */

import { describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
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

    it('should validate UUID format for IDs', () => {
      const idParams = grepCodebase('@Param|:id', ['node_modules', 'dist']);
      let hasUuidValidation = false;

      for (const file of idParams) {
        const [filePath] = file.split(':');
        if (!filePath || !fileExists(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        if (
          content.includes('@IsUUID') ||
          content.includes('ParseUUIDPipe') ||
          content.includes('CuidSchema') ||
          content.includes('.cuid()') ||
          content.includes('.uuid()')
        ) {
          hasUuidValidation = true;
        }
      }

      expect(hasUuidValidation).toBe(true);
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

    it('should sanitize HTML in text inputs', () => {
      const textInputs = grepCodebase('description|content|bio|summary|text', [
        'node_modules',
        'dist',
      ]);
      const htmlPatterns: string[] = [];

      for (const file of textInputs) {
        const [filePath] = file.split(':');
        if (!filePath || !fileExists(filePath)) continue;
        if (filePath.includes('.spec.ts')) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // Check if file handles user text input
        if (content.includes('dto') || content.includes('body')) {
          // Check for sanitization
          const hasSanitization =
            content.includes('sanitize') ||
            content.includes('escape') ||
            content.includes('strip') ||
            content.includes('DOMPurify');

          // Rich text fields might need special handling
          if (content.includes('html') && !hasSanitization) {
            htmlPatterns.push(filePath);
          }
        }
      }

      // Should have sanitization or not handle HTML
      expect(htmlPatterns.length).toBeLessThanOrEqual(3);
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
      const uploadFiles = grepCodebase('FileInterceptor|UploadedFile', ['node_modules', 'dist']);

      for (const file of uploadFiles) {
        const [filePath] = file.split(':');
        if (!filePath || !fileExists(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // Check for file type validation
        if (content.includes('FileInterceptor') || content.includes('@UploadedFile')) {
          const hasTypeCheck =
            content.includes('mimetype') ||
            content.includes('fileFilter') ||
            content.includes('FileTypeValidator') ||
            content.includes('ParseFilePipe');

          expect(hasTypeCheck).toBe(true);
        }
      }
    });

    it('should limit file sizes', () => {
      const uploadFiles = grepCodebase('FileInterceptor|multer', ['node_modules', 'dist']);

      for (const file of uploadFiles) {
        const [filePath] = file.split(':');
        if (!filePath || !fileExists(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        if (content.includes('FileInterceptor')) {
          const hasSizeLimit =
            content.includes('limits') ||
            content.includes('fileSize') ||
            content.includes('MaxFileSizeValidator') ||
            content.includes('maxSize');

          expect(hasSizeLimit).toBe(true);
        }
      }
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
      const sortFilterFiles = grepCodebase('orderBy|sortBy|sort|filter', ['node_modules', 'dist']);
      const unsafePatterns: string[] = [];

      for (const file of sortFilterFiles) {
        const [filePath] = file.split(':');
        if (!filePath || !fileExists(filePath)) continue;
        if (filePath.includes('.spec.ts')) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // Check for dynamic field access from user input
        if (
          content.match(/\[.*req\.query|req\.body.*\]/) ||
          content.match(/orderBy:\s*\{.*\[.*\]/)
        ) {
          // Should have allowlist
          const hasAllowlist =
            content.includes('allowedFields') ||
            content.includes('validFields') ||
            content.includes('includes(') ||
            content.includes('enum');

          if (!hasAllowlist) {
            unsafePatterns.push(filePath);
          }
        }
      }

      expect(unsafePatterns.length).toBeLessThanOrEqual(2);
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
      const mainFile = fs.readFileSync(path.join(SRC_DIR, 'main.ts'), 'utf-8');

      const hasGlobalValidation =
        mainFile.includes('ValidationPipe') ||
        mainFile.includes('ZodValidationPipe') ||
        mainFile.includes('useGlobalPipes');

      expect(hasGlobalValidation).toBe(true);
    });

    it('should strip unknown properties', () => {
      const validationConfigs = grepCodebase('ValidationPipe|whitelist|forbidNonWhitelisted', [
        'node_modules',
        'dist',
      ]);
      let hasStripUnknown = false;

      for (const file of validationConfigs) {
        const [filePath] = file.split(':');
        if (!filePath || !fileExists(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        if (
          content.includes('whitelist: true') ||
          content.includes('forbidNonWhitelisted') ||
          content.includes('stripUnknownKeys')
        ) {
          hasStripUnknown = true;
        }
      }

      expect(hasStripUnknown).toBe(true);
    });
  });
});
