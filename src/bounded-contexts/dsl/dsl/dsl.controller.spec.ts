/**
 * DSL Controller Unit Tests
 *
 * Tests the DSL controller endpoints for validation, preview, and rendering.
 * Focus: Request handling, target parameter, service delegation.
 *
 * Kent Beck: "Test the behaviors, not the implementation details"
 * Uncle Bob: "Controllers should be thin, delegating to services"
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { DslController } from './dsl.controller';
import type { DslRepository } from './dsl.repository';

describe('DslController', () => {
  let controller: DslController;
  let mockDslRepository: Partial<DslRepository>;

  const mockUserId = 'user-123';
  const mockResumeId = 'resume-456';
  const mockSlug = 'john-doe-software-engineer';

  const mockDsl: any = {
    version: '2.0',
    content: {
      name: 'John Doe',
      title: 'Software Engineer',
    },
    styles: {
      typography: { fontSize: 'md' },
    },
  };

  const mockAst: any = {
    meta: {
      version: '1.0',
      generatedAt: '2024-01-01T00:00:00.000Z',
    },
    page: {
      widthMm: 210,
      heightMm: 297,
      marginTopMm: 10,
      marginBottomMm: 10,
      marginLeftMm: 10,
      marginRightMm: 10,
      columns: [],
      columnGapMm: 0,
    },
    sections: [],
    globalStyles: {},
  };

  const mockValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  beforeEach(() => {
    mockDslRepository = {
      validate: mock(() => mockValidationResult),
      preview: mock(() => mockAst),
      render: mock(() =>
        Promise.resolve({ ast: mockAst, resumeId: mockResumeId }),
      ),
      renderPublic: mock(() =>
        Promise.resolve({ ast: mockAst, slug: mockSlug }),
      ),
    };

    controller = new DslController(mockDslRepository as DslRepository);
  });

  describe('validate', () => {
    it('should validate DSL and return validation result', () => {
      const result = controller.validate(mockDsl);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockValidationResult);
      expect(mockDslRepository.validate).toHaveBeenCalledWith(mockDsl);
    });

    it('should handle invalid DSL', () => {
      const invalidResult = {
        valid: false,
        errors: [{ path: 'version', message: 'Invalid version' }],
        warnings: [],
      };
      (mockDslRepository.validate as ReturnType<typeof mock>).mockReturnValue(
        invalidResult,
      );

      const result = controller.validate({ invalid: 'dsl' } as any);

      expect(result.success).toBe(true);
      expect(result.data?.valid).toBe(false);
      expect(result.data?.errors).toHaveLength(1);
    });
  });

  describe('preview', () => {
    it('should compile DSL to AST with default HTML target', () => {
      const result = controller.preview(mockDsl);

      expect(result.success).toBe(true);
      expect(result.data?.ast).toBeDefined();
      expect(mockDslRepository.preview).toHaveBeenCalledWith(mockDsl, 'html');
    });

    it('should compile DSL to AST with PDF target', () => {
      const result = controller.preview(mockDsl, 'pdf');

      expect(result.success).toBe(true);
      expect(result.data?.ast).toBeDefined();
      expect(mockDslRepository.preview).toHaveBeenCalledWith(mockDsl, 'pdf');
    });

    it('should compile DSL to AST with HTML target', () => {
      controller.preview(mockDsl, 'html');

      expect(mockDslRepository.preview).toHaveBeenCalledWith(mockDsl, 'html');
    });
  });

  describe('render', () => {
    it('should render resume AST for authenticated user', async () => {
      const result = await controller.render(mockUserId, mockResumeId);

      expect(result.success).toBe(true);
      expect(result.data?.ast).toBeDefined();
      expect(mockDslRepository.render).toHaveBeenCalledWith(
        mockResumeId,
        mockUserId,
        'html',
      );
    });

    it('should support PDF target for rendering', async () => {
      await controller.render(mockUserId, mockResumeId, 'pdf');

      expect(mockDslRepository.render).toHaveBeenCalledWith(
        mockResumeId,
        mockUserId,
        'pdf',
      );
    });
  });

  describe('renderPublic', () => {
    it('should render public resume by slug', async () => {
      const result = await controller.renderPublic(mockSlug);

      expect(result.success).toBe(true);
      expect(result.data?.ast).toBeDefined();
      expect(mockDslRepository.renderPublic).toHaveBeenCalledWith(
        mockSlug,
        'html',
      );
    });

    it('should support PDF target for public rendering', async () => {
      await controller.renderPublic(mockSlug, 'pdf');

      expect(mockDslRepository.renderPublic).toHaveBeenCalledWith(
        mockSlug,
        'pdf',
      );
    });
  });
});
