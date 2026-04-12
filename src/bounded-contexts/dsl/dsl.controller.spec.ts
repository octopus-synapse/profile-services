/**
 * DSL Controller Unit Tests
 *
 * Tests the DSL controller endpoints for validation, preview, and rendering.
 * Focus: Request handling, target parameter, service delegation.
 *
 * Kent Beck: "Test the behaviors, not the implementation details"
 * Uncle Bob: "Controllers should be thin, delegating to services"
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { DslController } from './dsl.controller';
import type { DslService } from './dsl.service';

describe('DslController', () => {
  let controller: DslController;
  let mockDslService: Record<string, ReturnType<typeof mock>>;
  type RenderRequest = Parameters<DslController['render']>[0];
  type ValidateInput = Parameters<DslController['validate']>[0];

  const mockUserId = 'user-123';
  const mockResumeId = 'resume-456';
  const mockSlug = 'john-doe-software-engineer';

  const mockDsl = {
    version: '2.0',
    content: {
      name: 'John Doe',
      title: 'Software Engineer',
    },
    styles: {
      typography: { fontSize: 'md' },
    },
  };

  const mockAst = {
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
    mockDslService = {
      validate: mock(() => mockValidationResult),
      preview: mock(() => mockAst),
      render: mock(() => Promise.resolve({ ast: mockAst, resumeId: mockResumeId })),
      renderPublic: mock(() => Promise.resolve({ ast: mockAst, slug: mockSlug })),
    };

    controller = new DslController(mockDslService as unknown as DslService);
  });

  describe('validate', () => {
    it('should validate DSL and return validation result', () => {
      const result = controller.validate(mockDsl);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockValidationResult);
      expect(mockDslService.validate).toHaveBeenCalledWith(mockDsl);
    });

    it('should handle invalid DSL', () => {
      const invalidResult = {
        valid: false,
        errors: [{ path: 'version', message: 'Invalid version' }],
        warnings: [],
      };
      (mockDslService.validate as ReturnType<typeof mock>).mockReturnValue(invalidResult);

      const invalidDsl = { invalid: 'dsl' } as unknown as ValidateInput;
      const result = controller.validate(invalidDsl);

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
      expect(mockDslService.preview).toHaveBeenCalledWith(mockDsl, 'html');
    });

    it('should compile DSL to AST with PDF target', () => {
      const result = controller.preview(mockDsl, 'pdf');

      expect(result.success).toBe(true);
      expect(result.data?.ast).toBeDefined();
      expect(mockDslService.preview).toHaveBeenCalledWith(mockDsl, 'pdf');
    });

    it('should compile DSL to AST with HTML target', () => {
      controller.preview(mockDsl, 'html');

      expect(mockDslService.preview).toHaveBeenCalledWith(mockDsl, 'html');
    });
  });

  describe('render', () => {
    it('should render resume AST for authenticated user', async () => {
      const result = await controller.render(
        { userId: mockUserId } as unknown as RenderRequest,
        mockResumeId,
      );

      expect(result.success).toBe(true);
      expect(result.data?.ast).toBeDefined();
      expect(mockDslService.render).toHaveBeenCalledWith(mockResumeId, mockUserId, 'html', 'en');
    });

    it('should support PDF target for rendering', async () => {
      await controller.render(
        { userId: mockUserId } as unknown as RenderRequest,
        mockResumeId,
        'pdf',
      );

      expect(mockDslService.render).toHaveBeenCalledWith(mockResumeId, mockUserId, 'pdf', 'en');
    });

    it('should pass locale parameter to service', async () => {
      await controller.render(
        { userId: mockUserId } as unknown as RenderRequest,
        mockResumeId,
        'html',
        'pt-BR',
      );

      expect(mockDslService.render).toHaveBeenCalledWith(mockResumeId, mockUserId, 'html', 'pt-BR');
    });
  });

  describe('renderPublic', () => {
    it('should render public resume by slug', async () => {
      const result = await controller.renderPublic(mockSlug);

      expect(result.success).toBe(true);
      expect(result.data?.ast).toBeDefined();
      expect(mockDslService.renderPublic).toHaveBeenCalledWith(mockSlug, 'html', 'en');
    });

    it('should support PDF target for public rendering', async () => {
      await controller.renderPublic(mockSlug, 'pdf');

      expect(mockDslService.renderPublic).toHaveBeenCalledWith(mockSlug, 'pdf', 'en');
    });

    it('should pass locale parameter to service', async () => {
      await controller.renderPublic(mockSlug, 'html', 'pt-BR');

      expect(mockDslService.renderPublic).toHaveBeenCalledWith(mockSlug, 'html', 'pt-BR');
    });
  });
});
