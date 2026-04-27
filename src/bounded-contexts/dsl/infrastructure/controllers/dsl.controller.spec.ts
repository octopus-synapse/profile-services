/**
 * DSL Controller Unit Tests
 *
 * Each handler is a wire over a use case; we mock the use cases
 * directly and assert the controller hands inputs through and wraps
 * the result in the canonical envelope.
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { PreviewDslUseCase } from '../../application/use-cases/preview-dsl/preview-dsl.use-case';
import { RenderPublicResumeDslUseCase } from '../../application/use-cases/render-public-resume-dsl/render-public-resume-dsl.use-case';
import { RenderResumeDslUseCase } from '../../application/use-cases/render-resume-dsl/render-resume-dsl.use-case';
import { ValidateDslUseCase } from '../../application/use-cases/validate-dsl/validate-dsl.use-case';
import { DslController } from './dsl.controller';

describe('DslController', () => {
  let controller: DslController;
  let validate: ReturnType<typeof mock>;
  let preview: ReturnType<typeof mock>;
  let render: ReturnType<typeof mock>;
  let renderPublic: ReturnType<typeof mock>;

  type RenderRequest = Parameters<DslController['render']>[0];

  const mockUserId = 'user-123';
  const mockResumeId = 'resume-456';
  const mockSlug = 'john-doe-software-engineer';

  const mockDsl = {
    version: '2.0',
    content: { name: 'John Doe', title: 'Software Engineer' },
    styles: { typography: { fontSize: 'md' } },
  };

  const mockAst = {
    meta: { version: '1.0', generatedAt: '2024-01-01T00:00:00.000Z' },
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

  const mockValidationResult = { valid: true, errors: null };

  beforeEach(() => {
    validate = mock(() => mockValidationResult);
    preview = mock(() => mockAst);
    render = mock(() => Promise.resolve({ ast: mockAst, resumeId: mockResumeId }));
    renderPublic = mock(() => Promise.resolve({ ast: mockAst, slug: mockSlug }));

    controller = new DslController(
      { execute: validate } as unknown as ValidateDslUseCase,
      { execute: preview } as unknown as PreviewDslUseCase,
      { execute: render } as unknown as RenderResumeDslUseCase,
      { execute: renderPublic } as unknown as RenderPublicResumeDslUseCase,
    );
  });

  describe('validate', () => {
    it('should validate DSL and return validation result', () => {
      const result = controller.validate(mockDsl);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockValidationResult);
      expect(validate).toHaveBeenCalledWith(mockDsl);
    });
  });

  describe('preview', () => {
    it('should compile DSL to AST with default HTML target', () => {
      const result = controller.preview(mockDsl);

      expect(result.success).toBe(true);
      expect(result.data?.ast).toBeDefined();
      expect(preview).toHaveBeenCalledWith(mockDsl, 'html');
    });

    it('should compile DSL to AST with PDF target', () => {
      controller.preview(mockDsl, 'pdf');
      expect(preview).toHaveBeenCalledWith(mockDsl, 'pdf');
    });
  });

  describe('render', () => {
    it('should render resume AST for authenticated user (default html, default locale)', async () => {
      const result = await controller.render(
        { userId: mockUserId } as unknown as RenderRequest,
        mockResumeId,
      );

      expect(result.success).toBe(true);
      expect(result.data?.ast).toBeDefined();
      expect(render).toHaveBeenCalledWith({
        resumeId: mockResumeId,
        userId: mockUserId,
        target: 'html',
        locale: 'en',
      });
    });

    it('should support PDF target for rendering', async () => {
      await controller.render(
        { userId: mockUserId } as unknown as RenderRequest,
        mockResumeId,
        'pdf',
      );
      expect(render).toHaveBeenCalledWith({
        resumeId: mockResumeId,
        userId: mockUserId,
        target: 'pdf',
        locale: 'en',
      });
    });

    it('should pass locale parameter to use case', async () => {
      await controller.render(
        { userId: mockUserId } as unknown as RenderRequest,
        mockResumeId,
        'html',
        'pt-BR',
      );
      expect(render).toHaveBeenCalledWith({
        resumeId: mockResumeId,
        userId: mockUserId,
        target: 'html',
        locale: 'pt-BR',
      });
    });
  });

  describe('renderPublic', () => {
    it('should render public resume by slug', async () => {
      const result = await controller.renderPublic(mockSlug);

      expect(result.success).toBe(true);
      expect(result.data?.ast).toBeDefined();
      expect(renderPublic).toHaveBeenCalledWith({ slug: mockSlug, target: 'html', locale: 'en' });
    });

    it('should support PDF target for public rendering', async () => {
      await controller.renderPublic(mockSlug, 'pdf');
      expect(renderPublic).toHaveBeenCalledWith({ slug: mockSlug, target: 'pdf', locale: 'en' });
    });

    it('should pass locale parameter to use case', async () => {
      await controller.renderPublic(mockSlug, 'html', 'pt-BR');
      expect(renderPublic).toHaveBeenCalledWith({
        slug: mockSlug,
        target: 'html',
        locale: 'pt-BR',
      });
    });
  });
});
