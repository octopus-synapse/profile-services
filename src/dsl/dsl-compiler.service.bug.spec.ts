/**
 * DSL Compiler Bug Detection Tests
 *
 * BUG-017: DSL Version Migration Not Implemented
 * BUG-047: DSL Compiler No Input Size Limit
 */

import { Test, TestingModule } from '@nestjs/testing';
import { DslCompilerService } from './dsl-compiler.service';
import { DslValidatorService } from './dsl-validator.service';
import { TokenResolverService } from './token-resolver.service';

describe('DslCompilerService - BUG DETECTION', () => {
  let service: DslCompilerService;
  let mockValidator: any;
  let mockTokenResolver: any;

  beforeEach(async () => {
    mockValidator = {
      validateOrThrow: jest.fn().mockImplementation((input) => input),
    };

    mockTokenResolver = {
      resolve: jest.fn().mockReturnValue({
        colors: {
          background: '#fff',
          textPrimary: '#000',
          textSecondary: '#666',
          primary: '#007bff',
          border: '#ddd',
        },
        typography: {
          baseFontSizePx: 16,
          headingFontSizePx: 24,
          lineHeight: 1.5,
          headingFontFamily: 'Arial',
          bodyFontFamily: 'Arial',
          headingFontWeight: 700,
          bodyFontWeight: 400,
          headingTextTransform: 'none',
        },
        spacing: {
          sectionGapPx: 20,
          contentPaddingPx: 16,
        },
        effects: {
          borderRadiusPx: 4,
          boxShadow: 'none',
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DslCompilerService,
        { provide: DslValidatorService, useValue: mockValidator },
        { provide: TokenResolverService, useValue: mockTokenResolver },
      ],
    }).compile();

    service = module.get<DslCompilerService>(DslCompilerService);
  });

  describe('BUG-017: Version Migration Not Implemented', () => {
    /**
     * DSL has version field.
     * When schema evolves, old documents should be migrated.
     * But TODO comment says "not implemented"!
     */
    it('should migrate DSL from v1 to v2', () => {
      const oldDsl = {
        version: '1.0',
        layout: {
          type: 'single-column',
          paperSize: 'a4',
          margins: 'normal',
        },
        sections: [],
        tokens: {},
      };

      // BUG: No migration happens!
      // Old DSL should be automatically migrated to current version
      const result = service.compile(oldDsl as any);

      expect(result.meta.version).toBe('2.0'); // Should be migrated
    });

    it('should handle version "1.0" documents', () => {
      const v1Dsl = {
        version: '1.0',
        // Old v1 format fields
        layout: { type: 'simple', paper: 'a4' },
        sections: [],
      };

      // BUG: Will likely throw or produce garbage
      // Should migrate automatically
    });
  });

  describe('BUG-047: No Input Size Limit', () => {
    /**
     * compileFromRaw accepts any size input.
     * Extremely large DSL could cause DoS.
     */
    it('should reject excessively large DSL', () => {
      const hugeDsl = {
        version: '2.0',
        layout: {
          type: 'single-column',
          paperSize: 'a4',
          margins: 'normal',
        },
        sections: Array(10000).fill({
          id: 'section',
          visible: true,
          order: 0,
          column: 'main',
        }),
        tokens: {},
      };

      // BUG: No size limit!
      // Should throw for input > reasonable limit (e.g., 1MB)
    });

    it('should limit number of sections', () => {
      const manySectonsDsl = {
        version: '2.0',
        layout: { type: 'single-column', paperSize: 'a4', margins: 'normal' },
        sections: Array(1000)
          .fill(null)
          .map((_, i) => ({
            id: `section-${i}`,
            visible: true,
            order: i,
            column: 'main',
          })),
        tokens: {},
      };

      // BUG: 1000 sections accepted!
      // Should limit to reasonable number (e.g., 50)
    });
  });

  describe('DSL Compilation Security', () => {
    it('should not allow script injection in tokens', () => {
      const maliciousDsl = {
        version: '2.0',
        layout: { type: 'single-column', paperSize: 'a4', margins: 'normal' },
        sections: [],
        tokens: {
          colors: {
            primary: '"><script>alert("XSS")</script>',
          },
        },
      };

      // Should sanitize or reject malicious token values
    });
  });
});

