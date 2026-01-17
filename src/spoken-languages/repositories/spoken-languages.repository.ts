/**
 * Spoken Languages Repository
 * Data access layer for spoken language catalog
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { APP_CONFIG } from '@octopus-synapse/profile-contracts';

export interface SpokenLanguage {
  code: string;
  nameEn: string;
  namePtBr: string;
  nameEs: string;
  nativeName: string | null;
}

@Injectable()
export class SpokenLanguagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all active spoken languages ordered by order field
   */
  async findAllActive(): Promise<SpokenLanguage[]> {
    return this.prisma.spokenLanguage.findMany({
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
  }

  /**
   * Search spoken languages by name (in any supported language)
   */
  async searchByName(
    searchQuery: string,
    limit: number = APP_CONFIG.SEARCH_AUTOCOMPLETE_LIMIT,
  ): Promise<SpokenLanguage[]> {
    return this.prisma.spokenLanguage.findMany({
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
  }

  /**
   * Find a single language by code
   */
  async findByCode(code: string): Promise<SpokenLanguage | null> {
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
