/**
 * Resume HTML Generator
 *
 * Realtime, Typst-free counterpart to `TypstPdfGeneratorService`. Runs the
 * same pipeline up to the `ResumeAst`, then renders HTML instead of
 * compiling a PDF:
 *
 *   userId → load resume + DSL → compile ResumeAst (target=html) → HTML
 *
 * No child process, no MinIO upload, no presigned URL — the HTML string is
 * returned inline. Used by `GET /v1/export/resume/preview` to show a
 * high-fidelity preview of the resume in-app.
 */

import type { DslUseCases } from '@/bounded-contexts/dsl';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import type { Locale } from '@/shared-kernel/utils/locale-resolver.util';
import { TypstUserIdRequiredException } from '../../../domain/exceptions/export.exceptions';
import type { AstHtmlRendererService } from './ast-html-renderer.service';

/** Map lang query param to Locale (mirrors TypstPdfGeneratorService). */
function resolveLocale(lang?: string): Locale {
  if (!lang) return 'pt-BR';
  const normalized = lang.toLowerCase().trim();
  if (normalized === 'en' || normalized === 'en-us') return 'en';
  return 'pt-BR';
}

export interface ResumeHtmlOptions {
  userId?: string;
  resumeId?: string;
  lang?: string;
  template?: 'default' | 'ats';
  themeStyleConfig?: Record<string, unknown>;
}

export class ResumeHtmlGeneratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dsl: Pick<DslUseCases, 'renderResumeDsl'>,
    private readonly renderer: AstHtmlRendererService,
    private readonly logger: LoggerPort,
  ) {}

  async generate(options: ResumeHtmlOptions = {}): Promise<string> {
    const userId = options.userId;
    if (!userId) throw new TypstUserIdRequiredException();

    const locale = resolveLocale(options.lang);
    const resumeId = options.resumeId ?? (await this.findPrimaryResumeId(userId));

    const { ast } = await this.dsl.renderResumeDsl.execute({
      resumeId,
      userId,
      target: 'html',
      locale,
      themeStyleConfig: options.themeStyleConfig,
    });

    const html = this.renderer.render(ast, { template: options.template ?? 'default' });
    this.logger.log(
      `Resume HTML preview generated for user ${userId} (${html.length} bytes)`,
      'ResumeHtmlGeneratorService',
    );
    return html;
  }

  private async findPrimaryResumeId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { primaryResumeId: true },
    });
    if (!user?.primaryResumeId) throw new EntityNotFoundException('Resume');
    return user.primaryResumeId;
  }
}
