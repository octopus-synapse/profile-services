/**
 * Typst PDF Generator Service
 *
 * Implements PdfGeneratorPort using Typst for server-side PDF generation.
 * Replaces Puppeteer-based rendering — no frontend dependency.
 *
 * Pipeline: userId → load resume + DSL → compile ResumeAst → serialize JSON → Typst compile → PDF
 */

import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { RenderResumeDslUseCase } from '@/bounded-contexts/dsl';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import type { SupportedLocale } from '@/shared-kernel/utils/locale-resolver';
import { TypstUserIdRequiredException } from '../../../domain/exceptions/export.exceptions';
import type { PdfGeneratorOptions } from '../../../domain/ports/pdf-generator.port';
import { TypstCompilerService } from './typst-compiler.service';
import { TypstDataSerializerService } from './typst-data-serializer.service';

/** Map lang query param to SupportedLocale */
function resolveLocale(lang?: string): SupportedLocale {
  if (!lang) return 'pt-BR';
  const normalized = lang.toLowerCase().trim();
  if (normalized === 'en' || normalized === 'en-us') return 'en';
  return 'pt-BR';
}

@Injectable()
export class TypstPdfGeneratorService {
  private readonly logger = new Logger(TypstPdfGeneratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => RenderResumeDslUseCase))
    private readonly renderResumeDsl: RenderResumeDslUseCase,
    private readonly serializer: TypstDataSerializerService,
    private readonly compiler: TypstCompilerService,
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

    this.logger.log(`Generating Typst PDF for user ${userId} with locale ${locale}`);

    // 1. Find resume: use explicit resumeId or fall back to user's primary
    const resumeId = options.resumeId ?? (await this.findPrimaryResumeId(userId));

    // 2. Render the resume DSL to AST via the use case (loads resume +
    //    theme, validates, compiles)
    const { ast } = await this.renderResumeDsl.execute({
      resumeId,
      userId,
      target: 'pdf',
      locale,
      themeStyleConfig: options.themeStyleConfig,
    });

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

    this.logger.log(`Typst PDF generated successfully (${buffer.length} bytes)`);
    return buffer;
  }

  private async findPrimaryResumeId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { primaryResumeId: true },
    });

    if (!user?.primaryResumeId) {
      throw new EntityNotFoundException('Resume');
    }

    return user.primaryResumeId;
  }
}
