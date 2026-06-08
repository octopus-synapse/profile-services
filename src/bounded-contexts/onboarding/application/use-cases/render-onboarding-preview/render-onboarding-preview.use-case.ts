/**
 * Render a live résumé preview from saved onboarding progress.
 *
 * Backs `GET /v1/onboarding/session/resume-preview`. The résumé-style
 * picker previews each candidate style with the user's REAL data (not the
 * baked sample) before they've finished onboarding — there's no primary
 * résumé yet, so we map the saved {@link OnboardingProgressData} into an
 * in-memory `GenericResume` and render it through the same DSL→AST→HTML
 * pipeline the Resume tab uses, in the style the user is previewing.
 *
 * The actual AST compile + HTML render is delegated to a function the
 * composition root wires from the export BC (`renderHtml`), keeping the
 * onboarding BC free of a build-time dependency on export/dsl internals.
 */

import type { LoggerPort } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import type { GenericResume } from '@/shared-kernel/schemas/sections';
import type { Locale } from '@/shared-kernel/utils/locale-resolver.util';
import type { OnboardingProgressUseCases } from '../../../domain/ports/onboarding-progress.port';
import type { ResumeStylesQueryPort } from '../../../domain/ports/resume-styles-query.port';
import type { SectionTypeDefinitionPort } from '../../../domain/ports/section-type-definition.port';
import {
  buildGenericResumeFromOnboarding,
  extractOnboardingDataFromProgress,
} from '../../mappers/onboarding-resume.mapper';

/** Compile + render an in-memory résumé to HTML. Supplied by the
 *  composition root (wraps the export BC's html generator). */
export type RenderOnboardingResumeHtmlFn = (input: {
  resume: GenericResume;
  styleConfig: Record<string, unknown>;
  template: 'default' | 'ats';
  sectionTypeTitles?: Map<string, string>;
}) => string | Promise<string>;

export interface RenderOnboardingPreviewInput {
  readonly userId: string;
  readonly styleId: string;
  readonly locale: Locale;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class RenderOnboardingPreviewUseCase {
  constructor(
    private readonly progress: OnboardingProgressUseCases,
    private readonly sectionTypes: SectionTypeDefinitionPort,
    private readonly resumeStyles: ResumeStylesQueryPort,
    private readonly renderHtml: RenderOnboardingResumeHtmlFn,
    private readonly logger: LoggerPort,
  ) {}

  async execute(input: RenderOnboardingPreviewInput): Promise<{ html: string }> {
    const [progressData, sectionTypes, style] = await Promise.all([
      this.progress.getProgressUseCase.execute(input.userId),
      this.sectionTypes.listAll(input.locale),
      this.resumeStyles.findStyleForPreview(input.styleId),
    ]);

    if (!style) throw new EntityNotFoundException('ResumeStyle', input.styleId);

    const data = extractOnboardingDataFromProgress(progressData);
    const resume = buildGenericResumeFromOnboarding(data, { sectionTypes });
    const styleConfig = isPlainObject(style.styleConfig) ? style.styleConfig : {};
    const template = style.typstTemplate === 'ats' ? 'ats' : 'default';
    const sectionTypeTitles = new Map(sectionTypes.map((t) => [t.key, t.title] as const));

    const html = await this.renderHtml({ resume, styleConfig, template, sectionTypeTitles });
    this.logger.log(
      `Onboarding résumé preview rendered for user ${input.userId} (${html.length} bytes)`,
      'RenderOnboardingPreviewUseCase',
    );
    return { html };
  }
}
