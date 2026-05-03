/**
 * DSL Testing Module
 *
 * In-memory implementations for testing DSL functionality. Use cases
 * receive these instead of the Prisma-backed adapters.
 */

import type { ResumeAst } from '@/bounded-contexts/dsl/domain/schemas/ast/resume-ast.schema';
import type { GenericResume } from '@/shared-kernel/schemas/sections';
import type { SupportedLocale } from '@/shared-kernel/utils/locale-resolver.util';
import { ResumeDslRepositoryPort } from '../domain/ports/resume-dsl.repository.port';

/** Mock AST result */
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

interface ShareSeed {
  readonly id: string;
  readonly slug: string;
  readonly isActive?: boolean;
  readonly expiresAt?: Date | null;
  readonly resumeId: string;
}

/** In-memory implementation of `ResumeDslRepositoryPort` for use case tests. */
export class InMemoryResumeDslRepository extends ResumeDslRepositoryPort {
  private resumes = new Map<string, GenericResume>();
  private shares = new Map<
    string,
    { id: string; slug: string; isActive: boolean; expiresAt: Date | null; resumeId: string }
  >();
  private sectionTypeTitles = new Map<string, string>();

  async findOwnedResume(
    resumeId: string,
    userId: string,
    _locale: SupportedLocale,
  ): Promise<GenericResume | null> {
    const resume = this.resumes.get(resumeId);
    if (!resume || resume.userId !== userId) return null;
    return resume;
  }

  async findPublicResumeBySlug(
    slug: string,
    _locale: SupportedLocale,
  ): Promise<GenericResume | null> {
    const share = this.shares.get(slug);
    if (!share) return null;
    if (!share.isActive) return null;
    if (share.expiresAt && new Date() > share.expiresAt) return null;
    return this.resumes.get(share.resumeId) ?? null;
  }

  async getSectionTypeTitles(_locale: SupportedLocale): Promise<Map<string, string>> {
    return new Map(this.sectionTypeTitles);
  }

  // ---- Test helpers ----

  seedResume(resume: Partial<GenericResume> & { id: string; userId: string }): void {
    const defaultStyle = {
      id: 'theme-1',
      name: 'Default',
      styleConfig: {
        version: '1.0.0',
        layout: { columns: 1 },
        tokens: { colors: {} },
        sections: [],
      },
    };
    // Use `'style' in resume` so `style: null` is preserved (rather than
    // falling back to default), letting tests exercise the
    // "no active style" branch.
    const defaultResume: GenericResume = {
      id: resume.id,
      userId: resume.userId,
      title: resume.title ?? 'Test Resume',
      fullName: resume.fullName ?? 'John Doe',
      jobTitle: resume.jobTitle ?? 'Developer',
      summary: resume.summary ?? 'Summary',
      phone: resume.phone ?? null,
      location: resume.location ?? null,
      linkedin: resume.linkedin ?? null,
      github: resume.github ?? null,
      website: resume.website ?? null,
      style: 'style' in resume ? (resume.style ?? null) : defaultStyle,
      customTheme: 'customTheme' in resume ? resume.customTheme : {},
      sections: resume.sections ?? [],
      createdAt: resume.createdAt ?? new Date(),
      updatedAt: resume.updatedAt ?? new Date(),
    };
    this.resumes.set(resume.id, defaultResume);
  }

  seedShare(share: ShareSeed): void {
    this.shares.set(share.slug, {
      id: share.id,
      slug: share.slug,
      isActive: share.isActive ?? true,
      expiresAt: share.expiresAt ?? null,
      resumeId: share.resumeId,
    });
  }

  seedSectionTypeTitle(key: string, title: string): void {
    this.sectionTypeTitles.set(key, title);
  }

  clear(): void {
    this.resumes.clear();
    this.shares.clear();
    this.sectionTypeTitles.clear();
  }
}

/** In-Memory DSL Compiler for testing */
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

/** In-Memory DSL Validator for testing */
export class InMemoryDslValidator {
  private validationResult: { valid: boolean; errors: string[] | null } = {
    valid: true,
    errors: null,
  };
  private validatedDsl: unknown = null;

  validate(dsl: unknown): { valid: boolean; errors?: string[] } {
    this.validatedDsl = dsl;
    return this.validationResult.errors
      ? { valid: this.validationResult.valid, errors: this.validationResult.errors }
      : { valid: this.validationResult.valid };
  }

  validateOrThrow(dsl: unknown): unknown {
    this.validatedDsl = dsl;
    if (!this.validationResult.valid) {
      throw new Error('Invalid DSL');
    }
    return dsl;
  }

  setValidationResult(result: { valid: boolean; errors: string[] | null }): void {
    this.validationResult = result;
  }

  getLastValidatedDsl(): unknown {
    return this.validatedDsl;
  }
}
