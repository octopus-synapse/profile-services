/**
 * TypstPdfGeneratorService Tests
 *
 * Tests the orchestration pipeline: userId → resume → AST → JSON → PDF.
 * All external dependencies are mocked.
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { DslUseCases } from '@/bounded-contexts/dsl';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { stubLogger } from '@/shared-kernel/logger/testing';
import type { TypstCompilerService } from './typst-compiler.service';
import type { TypstDataSerializerService } from './typst-data-serializer.service';
import { TypstPdfGeneratorService } from './typst-pdf-generator.service';

const MOCK_AST = {
  meta: { version: '1.0.0', generatedAt: '2026-01-01T00:00:00Z' },
  page: {
    widthMm: 210,
    heightMm: 297,
    marginTopMm: 15,
    marginBottomMm: 15,
    marginLeftMm: 15,
    marginRightMm: 15,
    columns: [{ id: 'main', widthPercentage: 100, order: 0 }],
    columnGapMm: 4,
  },
  sections: [],
  globalStyles: {
    background: '#FFFFFF',
    textPrimary: '#000000',
    textSecondary: '#666666',
    accent: '#0066CC',
  },
};

const MOCK_PDF_BUFFER = Buffer.from('%PDF-1.4 mock content');

describe('TypstPdfGeneratorService', () => {
  let service: TypstPdfGeneratorService;

  const mockPrisma = {
    user: {
      findUnique: mock().mockResolvedValue({ primaryResumeId: 'resume-123' }),
    },
  };

  const mockRenderResumeDslUseCase = {
    execute: mock().mockResolvedValue({ ast: MOCK_AST, resumeId: 'resume-123' }),
  };

  const mockSerializer = {
    serialize: mock().mockReturnValue('{ "mock":"data" }'),
  };

  const mockCompiler = {
    getTemplatesPath: mock().mockResolvedValue('/app/templates/typst'),
    compile: mock().mockResolvedValue(MOCK_PDF_BUFFER),
  };

  beforeEach(async () => {
    // Reset mocks
    mockPrisma.user.findUnique.mockResolvedValue({ primaryResumeId: 'resume-123' });
    mockRenderResumeDslUseCase.execute.mockResolvedValue({ ast: MOCK_AST, resumeId: 'resume-123' });
    mockSerializer.serialize.mockReturnValue('{ "mock":"data" }');
    mockCompiler.compile.mockResolvedValue(MOCK_PDF_BUFFER);

    service = new TypstPdfGeneratorService(
      mockPrisma as unknown as PrismaService,
      { renderResumeDsl: mockRenderResumeDslUseCase } as unknown as Pick<
        DslUseCases,
        'renderResumeDsl'
      >,
      mockSerializer as unknown as TypstDataSerializerService,
      mockCompiler as unknown as TypstCompilerService,
      stubLogger,
    );
  });

  describe('generate', () => {
    it('should return PDF buffer', async () => {
      const result = await service.generate({ userId: 'user-1' });

      expect(result).toBeInstanceOf(Buffer);
      expect(result).toBe(MOCK_PDF_BUFFER);
    });

    it('should throw if userId is not provided', async () => {
      await expect(service.generate({})).rejects.toThrow('userId is required');
    });

    it('should lookup primary resume for user', async () => {
      await service.generate({ userId: 'user-1' });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { primaryResumeId: true },
      });
    });

    it('should throw EntityNotFoundException if user has no primary resume', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ primaryResumeId: null });

      await expect(service.generate({ userId: 'user-1' })).rejects.toBeInstanceOf(
        EntityNotFoundException,
      );
    });

    it('should compile DSL with correct locale', async () => {
      await service.generate({ userId: 'user-1', lang: 'en' });

      expect(mockRenderResumeDslUseCase.execute).toHaveBeenCalledWith({
        resumeId: 'resume-123',
        userId: 'user-1',
        target: 'pdf',
        locale: 'en',
        themeStyleConfig: undefined,
      });
    });

    it('should default locale to pt-br', async () => {
      await service.generate({ userId: 'user-1' });

      expect(mockRenderResumeDslUseCase.execute).toHaveBeenCalledWith({
        resumeId: 'resume-123',
        userId: 'user-1',
        target: 'pdf',
        locale: 'pt-BR',
        themeStyleConfig: undefined,
      });
    });

    it('should serialize AST and pass to compiler', async () => {
      await service.generate({ userId: 'user-1' });

      expect(mockSerializer.serialize).toHaveBeenCalledWith(MOCK_AST);
      expect(mockCompiler.compile).toHaveBeenCalledWith(
        '{ "mock":"data" }',
        '/app/templates/typst',
        { timeout: undefined },
      );
    });

    it('should pass timeout option to compiler', async () => {
      await service.generate({ userId: 'user-1', timeout: 15000 });

      expect(mockCompiler.compile).toHaveBeenCalledWith(
        '{ "mock":"data" }',
        '/app/templates/typst',
        { timeout: 15000 },
      );
    });
  });
});
