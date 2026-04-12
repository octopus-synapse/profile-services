/**
 * System Themes Adapter
 *
 * Fetches system themes from the database for onboarding.
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
    return this.prisma.resumeTheme.findMany({
      where: { isSystemTheme: true, status: 'PUBLISHED' },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        tags: true,
        atsScore: true,
        thumbnailUrl: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}
