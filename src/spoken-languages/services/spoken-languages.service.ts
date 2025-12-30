/**
 * Spoken Languages Service
 * Query service for spoken language catalog
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { APP_CONSTANTS } from '../../common/constants/app.constants';

export interface SpokenLanguageDto {
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
  async getAll(): Promise<SpokenLanguageDto[]> {
    const languages = await this.prisma.spokenLanguage.findMany({
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

    return languages;
  }

  /**
   * Search spoken languages by name (in any supported language)
   */
  async search(
    query: string,
    limit: number = APP_CONSTANTS.SEARCH_AUTOCOMPLETE_LIMIT,
  ): Promise<SpokenLanguageDto[]> {
    const searchTerm = `%${query.toLowerCase()}%`;

    const languages = await this.prisma.spokenLanguage.findMany({
      where: {
        isActive: true,
        OR: [
          { nameEn: { contains: query, mode: 'insensitive' } },
          { namePtBr: { contains: query, mode: 'insensitive' } },
          { nameEs: { contains: query, mode: 'insensitive' } },
          { nativeName: { contains: query, mode: 'insensitive' } },
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

    return languages;
  }

  /**
   * Get a single language by code
   */
  async getByCode(code: string): Promise<SpokenLanguageDto | null> {
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
