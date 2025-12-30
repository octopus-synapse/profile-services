/**
 * Tech Skills Sync Service
 * Synchronizes tech skills from external sources (GitHub Linguist, Stack Overflow)
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import { GithubLinguistParserService } from './github-linguist-parser.service';
import { StackOverflowParserService } from './stackoverflow-parser.service';
import type {
  TechSkillsSyncResult,
  ParsedLanguage,
  ParsedSkill,
} from '../interfaces';
import { TECH_AREAS, TECH_NICHES } from '../data';

@Injectable()
export class TechSkillsSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly logger: AppLoggerService,
    private readonly linguistParser: GithubLinguistParserService,
    private readonly stackOverflowParser: StackOverflowParserService,
  ) {}

  /**
   * Run full sync of tech skills from external sources
   */
  async runSync(): Promise<TechSkillsSyncResult> {
    this.logger.log('Starting tech skills sync...');

    const result: TechSkillsSyncResult = {
      languagesInserted: 0,
      languagesUpdated: 0,
      skillsInserted: 0,
      skillsUpdated: 0,
      areasCreated: 0,
      nichesCreated: 0,
      errors: [],
    };

    try {
      // 1. Create/update tech areas
      result.areasCreated = await this.syncTechAreas();
      this.logger.log(
        `Tech areas synced: ${result.areasCreated} created/updated`,
      );

      // 2. Create/update tech niches
      result.nichesCreated = await this.syncTechNiches();
      this.logger.log(
        `Tech niches synced: ${result.nichesCreated} created/updated`,
      );

      // 3. Fetch and sync programming languages from GitHub Linguist
      const languages = await this.linguistParser.fetchAndParse();
      const langResult = await this.syncLanguages(languages);
      result.languagesInserted = langResult.inserted;
      result.languagesUpdated = langResult.updated;
      this.logger.log(
        `Languages synced: ${langResult.inserted} inserted, ${langResult.updated} updated`,
      );

      // 4. Fetch and sync skills from Stack Overflow
      const skills = await this.stackOverflowParser.fetchAndParse();
      const skillResult = await this.syncSkills(skills);
      result.skillsInserted = skillResult.inserted;
      result.skillsUpdated = skillResult.updated;
      this.logger.log(
        `Skills synced: ${skillResult.inserted} inserted, ${skillResult.updated} updated`,
      );

      // 5. Clear cache
      await this.clearCache();

      this.logger.log('Tech skills sync completed successfully');
    } catch (error) {
      this.logger.error('Tech skills sync failed', error);
      result.errors.push(
        error instanceof Error ? error.message : String(error),
      );
    }

    return result;
  }

  /**
   * Sync tech areas
   */
  private async syncTechAreas(): Promise<number> {
    let count = 0;

    for (const area of TECH_AREAS) {
      await this.prisma.techArea.upsert({
        where: { type: area.type },
        create: area,
        update: {
          nameEn: area.nameEn,
          namePtBr: area.namePtBr,
          descriptionEn: area.descriptionEn,
          descriptionPtBr: area.descriptionPtBr,
          icon: area.icon,
          color: area.color,
          order: area.order,
        },
      });
      count++;
    }

    return count;
  }

  /**
   * Sync tech niches
   */
  private async syncTechNiches(): Promise<number> {
    let count = 0;

    for (const niche of TECH_NICHES) {
      const area = await this.prisma.techArea.findUnique({
        where: { type: niche.areaType },
      });

      if (!area) {
        this.logger.warn(
          `Area not found for niche ${niche.slug}: ${niche.areaType}`,
        );
        continue;
      }

      await this.prisma.techNiche.upsert({
        where: { slug: niche.slug },
        create: {
          slug: niche.slug,
          nameEn: niche.nameEn,
          namePtBr: niche.namePtBr,
          descriptionEn: niche.descriptionEn,
          descriptionPtBr: niche.descriptionPtBr,
          icon: niche.icon,
          color: niche.color,
          order: niche.order,
          areaId: area.id,
        },
        update: {
          nameEn: niche.nameEn,
          namePtBr: niche.namePtBr,
          descriptionEn: niche.descriptionEn,
          descriptionPtBr: niche.descriptionPtBr,
          icon: niche.icon,
          color: niche.color,
          order: niche.order,
          areaId: area.id,
        },
      });
      count++;
    }

    return count;
  }

  /**
   * Sync programming languages
   */
  private async syncLanguages(
    languages: ParsedLanguage[],
  ): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;

    for (const lang of languages) {
      const existing = await this.prisma.programmingLanguage.findUnique({
        where: { slug: lang.slug },
      });

      if (existing) {
        await this.prisma.programmingLanguage.update({
          where: { slug: lang.slug },
          data: {
            nameEn: lang.nameEn,
            namePtBr: lang.namePtBr,
            color: lang.color,
            website: lang.website,
            aliases: lang.aliases,
            fileExtensions: lang.extensions,
            paradigms: lang.paradigms,
            typing: lang.typing,
            popularity: lang.popularity,
          },
        });
        updated++;
      } else {
        await this.prisma.programmingLanguage.create({
          data: {
            slug: lang.slug,
            nameEn: lang.nameEn,
            namePtBr: lang.namePtBr,
            color: lang.color,
            website: lang.website,
            aliases: lang.aliases,
            fileExtensions: lang.extensions,
            paradigms: lang.paradigms,
            typing: lang.typing,
            popularity: lang.popularity,
          },
        });
        inserted++;
      }
    }

    return { inserted, updated };
  }

  /**
   * Sync tech skills
   */
  private async syncSkills(
    skills: ParsedSkill[],
  ): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;

    for (const skill of skills) {
      // Find niche if specified
      let nicheId: string | null = null;
      if (skill.nicheSlug) {
        const niche = await this.prisma.techNiche.findUnique({
          where: { slug: skill.nicheSlug },
        });
        nicheId = niche?.id || null;
      }

      const existing = await this.prisma.techSkill.findUnique({
        where: { slug: skill.slug },
      });

      if (existing) {
        await this.prisma.techSkill.update({
          where: { slug: skill.slug },
          data: {
            nameEn: skill.nameEn,
            namePtBr: skill.namePtBr,
            type: skill.type,
            nicheId,
            color: skill.color,
            icon: skill.icon,
            website: skill.website,
            aliases: skill.aliases,
            keywords: skill.keywords,
            popularity: skill.popularity,
          },
        });
        updated++;
      } else {
        await this.prisma.techSkill.create({
          data: {
            slug: skill.slug,
            nameEn: skill.nameEn,
            namePtBr: skill.namePtBr,
            type: skill.type,
            nicheId,
            color: skill.color,
            icon: skill.icon,
            website: skill.website,
            aliases: skill.aliases,
            keywords: skill.keywords,
            popularity: skill.popularity,
          },
        });
        inserted++;
      }
    }

    return { inserted, updated };
  }

  /**
   * Clear all tech skills cache
   */
  private async clearCache(): Promise<void> {
    await Promise.all([
      this.cache.delete('tech:languages:list'),
      this.cache.delete('tech:skills:list'),
      this.cache.delete('tech:niches:list'),
      this.cache.delete('tech:areas:list'),
      this.cache.deletePattern('tech:skills:*'),
    ]);
  }
}
