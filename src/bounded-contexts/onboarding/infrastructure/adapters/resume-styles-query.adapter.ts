/**
 * ResumeStylesQueryAdapter
 *
 * Reads system `ResumeStyle` rows for the onboarding resume-style
 * picker. The previous `SystemThemesAdapter` (deleted) talked to the
 * same Prisma model but was disguised behind a "themes" naming that
 * implied a separate concept — there is none, the picker has always
 * shown rows of `ResumeStyle WHERE isSystem=true`.
 *
 * The adapter stays cross-BC-pragmatic: it queries `prisma.resumeStyle`
 * directly instead of importing the resume-styles BC's `ListStylesUseCase`,
 * because all we need is a thin projection (id/name/description/
 * styleScore/thumbnailUrl). Wrapping the dedicated use case would
 * just be ceremony for a single SELECT.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { OnboardingResumeStyleOption } from '../../domain/config/onboarding-steps.config';
import {
  type OnboardingPreviewStyle,
  ResumeStylesQueryPort,
} from '../../domain/ports/resume-styles-query.port';

export class ResumeStylesQueryAdapter extends ResumeStylesQueryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listSystemStyles(): Promise<OnboardingResumeStyleOption[]> {
    return this.prisma.resumeStyle.findMany({
      where: { isSystem: true },
      select: { id: true, name: true, description: true, styleScore: true, thumbnailUrl: true },
      orderBy: { name: 'asc' },
    });
  }

  async findStyleForPreview(id: string): Promise<OnboardingPreviewStyle | null> {
    const row = await this.prisma.resumeStyle.findFirst({
      where: { id, isSystem: true },
      select: { styleConfig: true, typstTemplate: true },
    });
    return row ? { styleConfig: row.styleConfig, typstTemplate: row.typstTemplate } : null;
  }
}
