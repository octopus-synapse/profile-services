/**
 * Languages Sync Service
 * Single Responsibility: Sync programming languages to database
 */

import { Injectable } from '@nestjs/common';
import { TechSkillsRepository } from '../repositories';
import type { ParsedLanguage } from '../interfaces';

@Injectable()
export class LanguagesSyncService {
  constructor(private readonly techSkillsRepo: TechSkillsRepository) {}

  async syncLanguages(
    languages: ParsedLanguage[],
  ): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;

    for (const lang of languages) {
      const existing = await this.techSkillsRepo.findLanguageBySlug(lang.slug);

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
        await this.techSkillsRepo.updateLanguageBySlug(lang.slug, data);
        updated++;
      } else {
        await this.techSkillsRepo.createLanguage({ slug: lang.slug, ...data });
        inserted++;
      }
    }

    return { inserted, updated };
  }
}
