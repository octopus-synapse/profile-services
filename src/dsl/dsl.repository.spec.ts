/**
 * DSL Repository Tests
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DslRepository } from './dsl.repository';
import { DslCompilerService } from './dsl-compiler.service';
import { DslValidatorService } from './dsl-validator.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DslRepository', () => {
  let repository: DslRepository;
  let compiler: DslCompilerService;
  let validator: DslValidatorService;
  let prisma: PrismaService;

  const mockResume = {
    id: 'resume-123',
    userId: 'user-123',
    slug: 'john-doe',
    isPublic: true,
    activeTheme: {
      styleConfig: {
        version: '1.0.0',
        layout: { columns: 1 },
        tokens: { colors: {} },
        sections: [],
      },
    },
    customTheme: {},
    experiences: [],
    education: [],
    skills: [],
    languages: [],
    projects: [],
    certifications: [],
    awards: [],
    recommendations: [],
    interests: [],
  };

  const mockAst = {
    meta: { version: '1.0.0', generatedAt: '2026-01-02T12:00:00.000Z' },
    page: { widthPx: 794, heightPx: 1123, columns: [] },
    sections: [],
    globalStyles: {
      background: '#ffffff',
      textPrimary: '#000000',
      textSecondary: '#666666',
      accent: '#0066cc',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DslRepository,
        {
          provide: DslCompilerService,
          useValue: {
            compileFromRaw: mock(),
            compileForHtml: mock(),
            compileForPdf: mock(),
          },
        },
        {
          provide: DslValidatorService,
          useValue: {
            validate: mock(),
            validateOrThrow: mock(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            resume: {
              findFirst: mock(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<DslRepository>(DslRepository);
    compiler = module.get<DslCompilerService>(DslCompilerService);
    validator = module.get<DslValidatorService>(DslValidatorService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('preview', () => {
    it('should compile DSL for preview', () => {
      const mockDsl = { version: '1.0.0' };
      spyOn(compiler, 'compileFromRaw').mockReturnValue(mockAst as any);

      const result = repository.preview(mockDsl, 'html');

      expect(compiler.compileFromRaw).toHaveBeenCalledWith(mockDsl, 'html');
      expect(result).toEqual(mockAst);
    });
  });

  describe('validate', () => {
    it('should validate DSL', () => {
      const mockDsl = { version: '1.0.0' };
      const mockValidation = { valid: true, errors: null };
      spyOn(validator, 'validate').mockReturnValue(mockValidation as any);

      const result = repository.validate(mockDsl);

      expect(validator.validate).toHaveBeenCalledWith(mockDsl);
      expect(result).toEqual(mockValidation);
    });
  });

  describe('render', () => {
    it('should render resume AST', async () => {
      jest
        .spyOn(prisma.resume, 'findFirst')
        .mockResolvedValue(mockResume as any);
      jest
        .spyOn(validator, 'validateOrThrow')
        .mockReturnValue(mockResume.activeTheme.styleConfig as any);
      spyOn(compiler, 'compileForHtml').mockReturnValue(mockAst as any);

      const result = await repository.render('resume-123', 'user-123', 'html');

      expect(prisma.resume.findFirst).toHaveBeenCalledWith({
        where: { id: 'resume-123', userId: 'user-123' },
        include: expect.any(Object),
      });
      expect(result).toEqual({
        ast: mockAst,
        resumeId: 'resume-123',
      });
    });

    it('should throw if resume not found', async () => {
      spyOn(prisma.resume, 'findFirst').mockResolvedValue(null);

      await expect(repository.render('resume-123', 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('renderPublic', () => {
    it('should render public resume AST', async () => {
      jest
        .spyOn(prisma.resume, 'findFirst')
        .mockResolvedValue(mockResume as any);
      jest
        .spyOn(validator, 'validateOrThrow')
        .mockReturnValue(mockResume.activeTheme.styleConfig as any);
      spyOn(compiler, 'compileForHtml').mockReturnValue(mockAst as any);

      const result = await repository.renderPublic('john-doe', 'html');

      expect(prisma.resume.findFirst).toHaveBeenCalledWith({
        where: { slug: 'john-doe', isPublic: true },
        include: expect.any(Object),
      });
      expect(result).toEqual({
        ast: mockAst,
        slug: 'john-doe',
      });
    });

    it('should throw if public resume not found', async () => {
      spyOn(prisma.resume, 'findFirst').mockResolvedValue(null);

      await expect(repository.renderPublic('john-doe')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('mergeDsl', () => {
    it('should deep merge DSL objects', async () => {
      const resumeWithCustom = {
        ...mockResume,
        activeTheme: {
          styleConfig: {
            version: '1.0.0',
            tokens: { colors: { primary: '#000000' } },
          },
        },
        customTheme: {
          tokens: { colors: { accent: '#ff0000' } },
        },
      };

      jest
        .spyOn(prisma.resume, 'findFirst')
        .mockResolvedValue(resumeWithCustom as any);
      jest
        .spyOn(validator, 'validateOrThrow')
        .mockImplementation((dsl) => dsl as any);
      spyOn(compiler, 'compileForHtml').mockReturnValue(mockAst as any);

      await repository.render('resume-123', 'user-123');

      expect(validator.validateOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({
          version: '1.0.0',
          tokens: {
            colors: {
              primary: '#000000',
              accent: '#ff0000',
            },
          },
        }),
      );
    });
  });
});
