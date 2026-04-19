/**
 * TypstPdfGeneratorService Tests
 *
 * Tests the orchestration pipeline: userId → resume → AST → JSON → PDF.
 * All external dependencies are mocked.
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { DslRepository } from '@/bounded-contexts/dsl/dsl.repository';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { TypstCompilerService } from './typst-compiler.service';
import { TypstDataSerializerService } from './typst-data-serializer.service';
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

  const mockDslRepository = {
    render: mock().mockResolvedValue({ ast: MOCK_AST, resumeId: 'resume-123' }),
  };

  const mockSerializer = {
    serialize: mock().mockReturnValue('{"mock":"data"}'),
  };

  const mockCompiler = {
    getTemplatesPath: mock().mockResolvedValue('/app/templates/typst'),
    compile: mock().mockResolvedValue(MOCK_PDF_BUFFER),
  };

  beforeEach(async () => {
    // Reset mocks
    mockPrisma.user.findUnique.mockResolvedValue({ primaryResumeId: 'resume-123' });
    mockDslRepository.render.mockResolvedValue({ ast: MOCK_AST, resumeId: 'resume-123' });
    mockSerializer.serialize.mockReturnValue('{"mock":"data"}');
    mockCompiler.compile.mockResolvedValue(MOCK_PDF_BUFFER);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TypstPdfGeneratorService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: DslRepository, useValue: mockDslRepository },
        { provide: TypstDataSerializerService, useValue: mockSerializer },
        { provide: TypstCompilerService, useValue: mockCompiler },
      ],
    }).compile();

    service = module.get<TypstPdfGeneratorService>(TypstPdfGeneratorService);
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

      expect(mockDslRepository.render).toHaveBeenCalledWith(
        'resume-123',
        'user-1',
        'pdf',
        'en',
        undefined,
      );
    });

    it('should default locale to pt-br', async () => {
      await service.generate({ userId: 'user-1' });

      expect(mockDslRepository.render).toHaveBeenCalledWith(
        'resume-123',
        'user-1',
        'pdf',
        'pt-BR',
        undefined,
      );
    });

    it('should serialize AST and pass to compiler', async () => {
      await service.generate({ userId: 'user-1' });

      expect(mockSerializer.serialize).toHaveBeenCalledWith(MOCK_AST);
      expect(mockCompiler.compile).toHaveBeenCalledWith('{"mock":"data"}', '/app/templates/typst', {
        timeout: undefined,
      });
    });

    it('should pass timeout option to compiler', async () => {
      await service.generate({ userId: 'user-1', timeout: 15000 });

      expect(mockCompiler.compile).toHaveBeenCalledWith('{"mock":"data"}', '/app/templates/typst', {
        timeout: 15000,
      });
    });
  });
});
