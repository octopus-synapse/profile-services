/**
 * DSL Repository Tests
 *
 * Pure tests using in-memory implementations.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { BadRequestException } from '@nestjs/common';
import { createMockResume } from '@test/factories/resume.factory';
import { DslRepository } from './dsl.repository';
import { InMemoryDslCompiler, InMemoryDslValidator, mockAst } from './testing';

type ResumeLike = {
  id: string;
  userId: string;
  slug?: string | null;
  isPublic?: boolean;
  customTheme?: unknown;
  activeTheme?: {
    styleConfig: {
      version: string;
      layout?: Record<string, unknown>;
      tokens?: Record<string, unknown>;
      sections?: unknown[];
    };
  };
  resumeSections?: unknown[];
};

type ShareLike = {
  id: string;
  slug: string;
  isActive: boolean;
  expiresAt: Date | null;
  resume: ResumeLike;
};

/**
 * Simple in-memory Prisma service for testing
 */
class InMemoryPrismaService {
  private resumes = new Map<string, ResumeLike>();
  private shares = new Map<string, ShareLike>();

  resume = {
    findFirst: async (args: { where: { id: string; userId: string } }) => {
      const resume = this.resumes.get(args.where.id);
      if (resume && resume.userId === args.where.userId) {
        return resume;
      }
      return null;
    },
  };

  resumeShare = {
    findUnique: async (args: { where: { slug: string } }) => {
      return this.shares.get(args.where.slug) ?? null;
    },
  };

  // Test helpers
  seedResume(resume: ResumeLike): void {
    this.resumes.set(resume.id, resume);
  }

  seedShare(share: ShareLike): void {
    this.shares.set(share.slug, share);
  }

  clear(): void {
    this.resumes.clear();
    this.shares.clear();
  }
}

describe('DslRepository', () => {
  let repository: DslRepository;
  let compiler: InMemoryDslCompiler;
  let validator: InMemoryDslValidator;
  let prisma: InMemoryPrismaService;

  const mockResume = {
    ...createMockResume({
      id: 'resume-123',
      userId: 'user-123',
      slug: 'john-doe',
      isPublic: true,
      customTheme: {},
    }),
    activeTheme: {
      styleConfig: {
        version: '1.0.0',
        layout: { columns: 1 },
        tokens: { colors: {} },
        sections: [],
      },
    },
  };

  beforeEach(() => {
    compiler = new InMemoryDslCompiler();
    validator = new InMemoryDslValidator();
    prisma = new InMemoryPrismaService();

    repository = new DslRepository(
      prisma as unknown as ConstructorParameters<typeof DslRepository>[0],
      compiler,
      validator as unknown as ConstructorParameters<typeof DslRepository>[2],
    );

    // Seed default data
    prisma.seedResume(mockResume);
  });

  describe('preview', () => {
    it('should compile DSL for preview', () => {
      const mockDsl = { version: '1.0.0' };

      const result = repository.preview(mockDsl, 'html');

      expect(compiler.getLastCompiledDsl()).toEqual(mockDsl);
      expect(result).toEqual(mockAst);
    });
  });

  describe('validate', () => {
    it('should validate DSL', () => {
      const mockDsl = { version: '1.0.0' };

      const result = repository.validate(mockDsl);

      expect(validator.getLastValidatedDsl()).toEqual(mockDsl);
      expect(result).toEqual({ valid: true, errors: null });
    });

    it('should return errors when validation fails', () => {
      validator.setValidationResult({
        valid: false,
        errors: [{ message: 'Invalid version' }],
      });
      const mockDsl = { version: 'invalid' };

      const result = repository.validate(mockDsl);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('render', () => {
    it('should render resume AST', async () => {
      const result = await repository.render('resume-123', 'user-123', 'html');

      expect(result).toEqual({
        ast: mockAst,
        resumeId: 'resume-123',
      });
    });

    it('should throw if resume not found', async () => {
      await expect(async () => await repository.render('non-existent', 'user-123')).toThrow(
        BadRequestException,
      );
    });

    it('should throw if user does not own resume', async () => {
      await expect(async () => await repository.render('resume-123', 'other-user')).toThrow(
        BadRequestException,
      );
    });

    it('should pass generic sections to compiler data', async () => {
      const resumeWithSections = {
        ...mockResume,
        resumeSections: [
          {
            id: 'section-1',
            sectionTypeId: 'type-1',
            titleOverride: null,
            isVisible: true,
            order: 0,
            sectionType: {
              key: 'work_experience_v1',
              title: 'Work Experience',
              semanticKind: 'WORK_EXPERIENCE',
            },
            items: [
              {
                id: 'item-1',
                order: 0,
                isVisible: true,
                content: { position: 'Dev', company: 'Acme' },
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
              },
            ],
          },
        ],
      };

      prisma.seedResume(resumeWithSections);

      await repository.render('resume-123', 'user-123', 'html');

      const compiledData = compiler.getLastCompiledData();
      expect(compiledData).toBeTruthy();
      if (!compiledData || typeof compiledData !== 'object') {
        throw new Error('Expected compiled data object');
      }
      const sections = (compiledData as { sections?: unknown }).sections;
      expect(Array.isArray(sections)).toBe(true);
      if (!Array.isArray(sections)) {
        throw new Error('Expected sections array');
      }
      expect(sections).toBeDefined();
      expect(sections).toHaveLength(1);
      const firstSection = sections[0] as { semanticKind?: string };
      expect(firstSection.semanticKind).toBe('WORK_EXPERIENCE');
    });
  });

  describe('renderPublic', () => {
    it('should render public resume AST', async () => {
      prisma.seedShare({
        id: 'share-123',
        slug: 'john-doe',
        isActive: true,
        expiresAt: null,
        resume: mockResume,
      });

      const result = await repository.renderPublic('john-doe', 'html');

      expect(result).toEqual({
        ast: mockAst,
        slug: 'john-doe',
      });
    });

    it('should throw if public resume not found', async () => {
      await expect(async () => await repository.renderPublic('non-existent')).toThrow(
        BadRequestException,
      );
    });

    it('should throw if share is not active', async () => {
      prisma.seedShare({
        id: 'share-123',
        slug: 'inactive-share',
        isActive: false,
        expiresAt: null,
        resume: mockResume,
      });

      await expect(async () => await repository.renderPublic('inactive-share')).toThrow(
        BadRequestException,
      );
    });

    it('should throw if share is expired', async () => {
      prisma.seedShare({
        id: 'share-123',
        slug: 'expired-share',
        isActive: true,
        expiresAt: new Date('2020-01-01'), // Past date
        resume: mockResume,
      });

      await expect(async () => await repository.renderPublic('expired-share')).toThrow(
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

      prisma.seedResume(resumeWithCustom);

      await repository.render('resume-123', 'user-123');

      const validatedDsl = validator.getLastValidatedDsl();
      expect(validatedDsl).toBeTruthy();
      if (!validatedDsl || typeof validatedDsl !== 'object') {
        throw new Error('Expected validated DSL object');
      }
      const tokens = (validatedDsl as { tokens?: { colors?: Record<string, string> } }).tokens;
      if (!tokens?.colors) {
        throw new Error('Expected DSL token colors');
      }
      const validatedDslVersion = (validatedDsl as { version?: string }).version;
      expect(validatedDslVersion).toBe('1.0.0');
      expect(tokens.colors.primary).toBe('#000000');
      expect(tokens.colors.accent).toBe('#ff0000');
    });
  });

  /**
   * TDD Red Phase: No Theme Scenarios
   *
   * These tests verify that the repository throws a clear, descriptive error
   * when attempting to render a resume that has no active theme set.
   * This is a common scenario after onboarding when no theme is applied yet.
   */
  describe('render - no theme scenarios', () => {
    it('should throw descriptive error when resume has no activeTheme', async () => {
      const resumeWithoutTheme = {
        ...createMockResume({
          id: 'resume-no-theme',
          userId: 'user-123',
        }),
        activeTheme: null,
        customTheme: null,
      };

      prisma.seedResume(resumeWithoutTheme as unknown as ResumeLike);

      await expect(repository.render('resume-no-theme', 'user-123')).rejects.toThrow(/theme/i);
    });

    it('should throw when activeTheme has null styleConfig', async () => {
      const resumeWithNullConfig = {
        ...createMockResume({
          id: 'resume-null-config',
          userId: 'user-123',
        }),
        activeTheme: { styleConfig: null },
        customTheme: null,
      };

      prisma.seedResume(resumeWithNullConfig as unknown as ResumeLike);

      await expect(repository.render('resume-null-config', 'user-123')).rejects.toThrow(/theme/i);
    });

    it('should throw when activeTheme has empty styleConfig object', async () => {
      const resumeWithEmptyConfig = {
        ...createMockResume({
          id: 'resume-empty-config',
          userId: 'user-123',
        }),
        activeTheme: { styleConfig: {} },
        customTheme: null,
      };

      prisma.seedResume(resumeWithEmptyConfig as unknown as ResumeLike);

      await expect(repository.render('resume-empty-config', 'user-123')).rejects.toThrow(/theme/i);
    });

    it('should include actionable message in the error', async () => {
      const resumeWithoutTheme = {
        ...createMockResume({
          id: 'resume-actionable',
          userId: 'user-123',
        }),
        activeTheme: null,
        customTheme: null,
      };

      prisma.seedResume(resumeWithoutTheme as unknown as ResumeLike);

      await expect(repository.render('resume-actionable', 'user-123')).rejects.toThrow(
        /apply.*theme|select.*theme/i,
      );
    });
  });
});
