/**
 * Spoken Languages Service
 * Query service for spoken language catalog
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { APP_CONFIG } from '@/shared-kernel';

export interface SpokenLanguage {
  code: string;
  nameEn: string;
  namePtBr: string;
  nameEs: string;
  nativeName: string | null;
}

@Injectable()
export class SpokenLanguagesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all active spoken languages ordered by order field
   */
  async findAllActiveLanguages(): Promise<SpokenLanguage[]> {
    const activeLanguages = await this.prisma.spokenLanguage.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      select: {
        code: true,
        nameEn: true,
        namePtBr: true,
        nameEs: true,
        nativeName: true,
      },
    });

    return activeLanguages;
  }

  /**
   * Search spoken languages by name (in any supported language)
   */
  async searchLanguagesByName(
    searchQuery: string,
    limit: number = APP_CONFIG.SEARCH_AUTOCOMPLETE_LIMIT,
  ): Promise<SpokenLanguage[]> {
    const matchingLanguages = await this.prisma.spokenLanguage.findMany({
      where: {
        isActive: true,
        OR: [
          { nameEn: { contains: searchQuery, mode: 'insensitive' } },
          { namePtBr: { contains: searchQuery, mode: 'insensitive' } },
          { nameEs: { contains: searchQuery, mode: 'insensitive' } },
          { nativeName: { contains: searchQuery, mode: 'insensitive' } },
        ],
      },
      orderBy: { order: 'asc' },
      take: limit,
      select: {
        code: true,
        nameEn: true,
        namePtBr: true,
        nameEs: true,
        nativeName: true,
      },
    });

    return matchingLanguages;
  }

  /**
   * Get a single language by code
   */
  async findLanguageByCode(code: string): Promise<SpokenLanguage | null> {
    return this.prisma.spokenLanguage.findUnique({
      where: { code },
      select: {
        code: true,
        nameEn: true,
        namePtBr: true,
        nameEs: true,
        nativeName: true,
      },
    });
  }
}
