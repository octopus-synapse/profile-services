/**
 * Typst PDF Generator Service
 *
 * Implements PdfGeneratorPort using Typst for server-side PDF generation.
 * Replaces Puppeteer-based rendering — no frontend dependency.
 *
 * Pipeline: userId → load resume + DSL → compile ResumeAst → serialize JSON → Typst compile → PDF
 */

import type { DslUseCases } from '@/bounded-contexts/dsl';
import type { ResumeAst } from '@/bounded-contexts/dsl/domain/schemas/ast/resume-ast.schema';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import type { Locale } from '@/shared-kernel/utils/locale-resolver.util';
import { TypstUserIdRequiredException } from '../../../domain/exceptions/export.exceptions';
import type { PdfGeneratorOptions } from '../../../domain/ports/pdf-generator.port';
import type { TypstCompilerService } from './typst-compiler.service';
import type { TypstDataSerializerService } from './typst-data-serializer.service';

/** Map lang query param to Locale */
function resolveLocale(lang?: string): Locale {
  if (!lang) return 'pt-BR';
  const normalized = lang.toLowerCase().trim();
  if (normalized === 'en' || normalized === 'en-us') return 'en';
  return 'pt-BR';
}

export class TypstPdfGeneratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dsl: Pick<DslUseCases, 'renderResumeDsl' | 'renderSampleResumeDsl'>,
    private readonly serializer: TypstDataSerializerService,
    private readonly compiler: TypstCompilerService,
    private readonly logger: LoggerPort,
  ) {}

  /**
   * Generate a PDF buffer for the user's primary resume using Typst.
   * Implements the same interface as PdfGeneratorPort.
   */
  async generate(options: PdfGeneratorOptions = {}): Promise<Buffer> {
    const userId = options.userId;
    if (!userId) {
      throw new TypstUserIdRequiredException();
    }

    const locale = resolveLocale(options.lang);

    this.logger.log(
      `Generating Typst PDF for user ${userId} with locale ${locale}`,
      'TypstPdfGeneratorService',
    );

    // 1. Find resume: explicit resumeId, else the user's primary.
    const resumeId = options.resumeId ?? (await this.findPrimaryResumeIdOrNull(userId));

    // 2. Render to AST. With a résumé we render the user's real content;
    //    without one we either render the built-in sample (generic style
    //    preview — onboarding has no résumé yet) or 404 as before.
    let ast: ResumeAst;
    if (resumeId) {
      ({ ast } = await this.dsl.renderResumeDsl.execute({
        resumeId,
        userId,
        target: 'pdf',
        locale,
        themeStyleConfig: options.themeStyleConfig,
      }));
    } else if (options.sampleFallback) {
      this.logger.log(
        `No primary résumé for user ${userId}; rendering sample preview`,
        'TypstPdfGeneratorService',
      );
      ({ ast } = this.dsl.renderSampleResumeDsl.execute({
        styleConfig: options.themeStyleConfig ?? {},
        target: 'pdf',
        locale,
      }));
    } else {
      throw new EntityNotFoundException('Resume');
    }

    // 3. Serialize AST to JSON for Typst templates
    const jsonData = this.serializer.serialize(ast);

    // 4. Compile Typst templates with data → PDF buffer
    const templatesPath =
      options.template === 'ats'
        ? await this.compiler.getAtsTemplatesPath()
        : await this.compiler.getTemplatesPath();
    const buffer = await this.compiler.compile(jsonData, templatesPath, {
      timeout: options.timeout,
    });

    this.logger.log(
      `Typst PDF generated successfully (${buffer.length} bytes)`,
      'TypstPdfGeneratorService',
    );
    return buffer;
  }

  private async findPrimaryResumeIdOrNull(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { primaryResumeId: true },
    });

    return user?.primaryResumeId ?? null;
  }
}
