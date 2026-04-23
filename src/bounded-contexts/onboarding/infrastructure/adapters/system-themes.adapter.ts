/**
 * System Themes Adapter
 *
 * Fetches system ResumeStyle rows for the onboarding style-picker step.
 * The name preserves backwards compatibility with the SystemThemesPort
 * contract; a follow-up will rename the port to `SystemStylesPort`.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { OnboardingThemeOption } from '../../domain/config/onboarding-steps.config';
import { SystemThemesPort } from '../../domain/ports/system-themes.port';

@Injectable()
export class SystemThemesAdapter extends SystemThemesPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getSystemThemes(): Promise<OnboardingThemeOption[]> {
    return this.prisma.resumeStyle.findMany({
      where: { isSystem: true },
      select: {
        id: true,
        name: true,
        description: true,
        styleScore: true,
        thumbnailUrl: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}
