/**
 * DSL Testing Module
 *
 * In-memory implementations for testing DSL functionality.
 */

import type { ResumeAst } from '@/bounded-contexts/dsl/domain/schemas/ast/resume-ast.schema';
import type { GenericResume } from '@/shared-kernel/schemas/sections';

/**
 * Mock AST result
 */
export const mockAst: ResumeAst = {
  meta: { version: '1.0.0', generatedAt: new Date().toISOString() },
  page: {
    widthMm: 210,
    heightMm: 297,
    marginTopMm: 10,
    marginBottomMm: 10,
    marginLeftMm: 10,
    marginRightMm: 10,
    columns: [],
    columnGapMm: 5,
  },
  sections: [],
  globalStyles: {
    background: '#ffffff',
    textPrimary: '#000000',
    textSecondary: '#666666',
    accent: '#0066cc',
  },
};

/**
 * In-Memory Resume Data Access for DSL testing
 */
export class InMemoryDslResumeRepository {
  private resumes = new Map<string, GenericResume>();
  private shares = new Map<
    string,
    {
      id: string;
      slug: string;
      isActive: boolean;
      expiresAt: Date | null;
      resume: GenericResume;
    }
  >();

  async findResumeByIdAndUser(resumeId: string, userId: string): Promise<GenericResume | null> {
    const resume = this.resumes.get(resumeId);
    if (resume && resume.userId === userId) {
      return resume;
    }
    return null;
  }

  async findShareBySlug(slug: string): Promise<{
    id: string;
    slug: string;
    isActive: boolean;
    expiresAt: Date | null;
    resume: GenericResume;
  } | null> {
    return this.shares.get(slug) ?? null;
  }

  // Test helpers
  seedResume(resume: Partial<GenericResume> & { id: string; userId: string }): void {
    const defaultResume: GenericResume = {
      id: resume.id,
      userId: resume.userId,
      title: resume.title ?? 'Test Resume',
      fullName: resume.fullName ?? 'John Doe',
      jobTitle: resume.jobTitle ?? 'Developer',
      summary: resume.summary ?? 'Summary',
      phone: resume.phone ?? null,
      emailContact: resume.emailContact ?? null,
      location: resume.location ?? null,
      linkedin: resume.linkedin ?? null,
      github: resume.github ?? null,
      website: resume.website ?? null,
      activeTheme: resume.activeTheme ?? {
        id: 'theme-1',
        name: 'Default',
        styleConfig: {
          version: '1.0.0',
          layout: { columns: 1 },
          tokens: { colors: {} },
          sections: [],
        },
      },
      customTheme: resume.customTheme ?? {},
      sections: resume.sections ?? [],
      createdAt: resume.createdAt ?? new Date(),
      updatedAt: resume.updatedAt ?? new Date(),
    };

    this.resumes.set(resume.id, defaultResume);
  }

  seedShare(share: {
    id: string;
    slug: string;
    isActive?: boolean;
    expiresAt?: Date | null;
    resumeId: string;
  }): void {
    const resume = this.resumes.get(share.resumeId);
    if (resume) {
      this.shares.set(share.slug, {
        id: share.id,
        slug: share.slug,
        isActive: share.isActive ?? true,
        expiresAt: share.expiresAt ?? null,
        resume,
      });
    }
  }

  clear(): void {
    this.resumes.clear();
    this.shares.clear();
  }
}

/**
 * In-Memory DSL Compiler for testing
 */
export class InMemoryDslCompiler {
  private astResult: ResumeAst = mockAst;
  private compiledDsl: unknown = null;
  private compiledData: unknown = null;

  compileFromRaw(dsl: unknown, _target: 'html' | 'pdf' = 'html'): ResumeAst {
    this.compiledDsl = dsl;
    return { ...this.astResult };
  }

  compileForHtml(dsl: unknown, data: unknown): ResumeAst {
    this.compiledDsl = dsl;
    this.compiledData = data;
    return { ...this.astResult };
  }

  compileForPdf(dsl: unknown, data: unknown): ResumeAst {
    this.compiledDsl = dsl;
    this.compiledData = data;
    return { ...this.astResult };
  }

  // Test helpers
  getLastCompiledDsl(): unknown {
    return this.compiledDsl;
  }

  getLastCompiledData(): unknown {
    return this.compiledData;
  }

  setAstResult(ast: ResumeAst): void {
    this.astResult = ast;
  }
}

/**
 * In-Memory DSL Validator for testing
 */
export class InMemoryDslValidator {
  private validationResult: { valid: boolean; errors: unknown[] | null } = {
    valid: true,
    errors: null,
  };
  private validatedDsl: unknown = null;

  validate(dsl: unknown): { valid: boolean; errors: unknown[] | null } {
    this.validatedDsl = dsl;
    return this.validationResult;
  }

  validateOrThrow(dsl: unknown): unknown {
    this.validatedDsl = dsl;
    if (!this.validationResult.valid) {
      throw new Error('Invalid DSL');
    }
    return dsl;
  }

  // Test helpers
  setValidationResult(result: { valid: boolean; errors: unknown[] | null }): void {
    this.validationResult = result;
  }

  getLastValidatedDsl(): unknown {
    return this.validatedDsl;
  }
}
