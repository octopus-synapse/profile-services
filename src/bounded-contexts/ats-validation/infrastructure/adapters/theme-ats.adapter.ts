/**
 * Theme ATS Adapter
 *
 * Infrastructure adapter implementing ThemeATSPort using Prisma.
 * Fetches theme data for ATS scoring purposes.
 */

import { Injectable } from '@nestjs/common';
import type {
  ThemeATSPort,
  ThemeForATSScoring,
  ThemeStyleConfig,
} from '../../ats/interfaces/theme-ats-scoring.interface';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

@Injectable()
export class ThemeATSAdapter implements ThemeATSPort {
  constructor(private readonly prisma: PrismaService) {}

  async getThemeById(themeId: string): Promise<ThemeForATSScoring | null> {
    const theme = await this.prisma.resumeTheme.findUnique({
      where: { id: themeId },
      select: {
        id: true,
        name: true,
        styleConfig: true,
      },
    });

    if (!theme) {
      return null;
    }

    return {
      id: theme.id,
      name: theme.name,
      styleConfig: theme.styleConfig as unknown as ThemeStyleConfig,
    };
  }
}
