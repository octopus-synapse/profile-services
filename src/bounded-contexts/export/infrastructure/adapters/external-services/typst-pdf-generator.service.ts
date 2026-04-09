/**
 * Typst PDF Generator Service
 *
 * Implements PdfGeneratorPort using Typst for server-side PDF generation.
 * Replaces Puppeteer-based rendering — no frontend dependency.
 *
 * Pipeline: userId → load resume + DSL → compile ResumeAst → serialize JSON → Typst compile → PDF
 */

import { Inject, Injectable, Logger, NotFoundException, forwardRef } from '@nestjs/common';
import { DslRepository } from '@/bounded-contexts/dsl/dsl/dsl.repository';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { SupportedLocale } from '@/shared-kernel/utils/locale-resolver';
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
    @Inject(forwardRef(() => DslRepository))
    private readonly dslRepository: DslRepository,
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
      throw new Error('userId is required for Typst PDF generation');
    }

    const locale = resolveLocale(options.lang);

    this.logger.log(`Generating Typst PDF for user ${userId} with locale ${locale}`);

    // 1. Find the user's primary resume
    const resumeId = await this.findPrimaryResumeId(userId);

    // 2. Use DslRepository to load resume + theme + compile AST
    const { ast } = await this.dslRepository.render(resumeId, userId, 'pdf', locale);

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
      throw new NotFoundException('User has no primary resume configured');
    }

    return user.primaryResumeId;
  }
}
