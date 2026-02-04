/**
 * Languages Sync Service
 * Single Responsibility: Sync programming languages to database
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { ParsedLanguage } from '../interfaces';

@Injectable()
export class LanguagesSyncService {
  constructor(private readonly prisma: PrismaService) {}

  async syncLanguages(
    languages: ParsedLanguage[],
  ): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;

    for (const lang of languages) {
      const existing = await this.prisma.programmingLanguage.findUnique({
        where: { slug: lang.slug },
      });

      const data = {
        nameEn: lang.nameEn,
        namePtBr: lang.namePtBr,
        color: lang.color,
        website: lang.website,
        aliases: lang.aliases,
        fileExtensions: lang.extensions,
        paradigms: lang.paradigms,
        typing: lang.typing,
        popularity: lang.popularity,
      };

      if (existing) {
        await this.prisma.programmingLanguage.update({
          where: { slug: lang.slug },
          data,
        });
        updated++;
      } else {
        await this.prisma.programmingLanguage.create({
          data: { slug: lang.slug, ...data },
        });
        inserted++;
      }
    }

    return { inserted, updated };
  }
}
