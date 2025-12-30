/**
 * Stack Overflow Tags Parser Service
 *
 * Fetches popular tech skills from Stack Overflow tags API
 * and parses them into structured skill data.
 */

import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '../../common/logger/logger.service';
import type {
  StackOverflowResponse,
  ParsedSkill,
  SkillType,
} from '../interfaces';
import {
  SKILL_CATEGORIES,
  SKILL_TRANSLATIONS,
  SKILL_COLORS,
} from '../constants';
import {
  formatDisplayName,
  normalizeSlug,
  isProgrammingLanguage,
  shouldSkipTag,
  getAliases,
  getKeywords,
} from '../utils';

@Injectable()
export class StackOverflowParserService {
  private readonly SO_API_URL = 'https://api.stackexchange.com/2.3/tags';
  private readonly MAX_PAGES = 10;

  constructor(private readonly logger: AppLoggerService) {}

  /**
   * Fetch and parse skills from Stack Overflow tags
   */
  async fetchAndParse(): Promise<ParsedSkill[]> {
    this.logger.log('Fetching Stack Overflow tags...');

    const allTags: { name: string; count: number }[] = [];

    try {
      for (let page = 1; page <= this.MAX_PAGES; page++) {
        const url = `${this.SO_API_URL}?page=${page}&pagesize=100&order=desc&sort=popular&site=stackoverflow`;

        const response = await fetch(url);
        if (!response.ok) {
          this.logger.warn(`Failed to fetch page ${page}: ${response.status}`);
          break;
        }

        const data: StackOverflowResponse = await response.json();
        for (const tag of data.items) {
          allTags.push({ name: tag.name, count: tag.count });
        }

        if (!data.has_more) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      return this.parseTags(allTags);
    } catch (error) {
      this.logger.error('Failed to fetch Stack Overflow tags', error);
      throw error;
    }
  }

  /**
   * Parse tags into structured skill data
   */
  private parseTags(tags: { name: string; count: number }[]): ParsedSkill[] {
    const parsed: ParsedSkill[] = [];
    const seenSlugs = new Set<string>();
    const hasOwn = (obj: Record<string, unknown>, key: string) =>
      Object.prototype.hasOwnProperty.call(obj, key);

    for (const tag of tags) {
      const slug = normalizeSlug(tag.name);
      const tagLower = tag.name.toLowerCase();

      if (seenSlugs.has(slug)) continue;
      if (isProgrammingLanguage(tag.name)) continue;
      if (shouldSkipTag(tag.name)) continue;

      const category = this.getCategory(tagLower, slug, hasOwn);
      seenSlugs.add(slug);

      parsed.push({
        slug,
        nameEn: formatDisplayName(tag.name),
        namePtBr: this.getTranslation(tagLower, slug, tag.name, hasOwn),
        type: category.type,
        nicheSlug: category.niche,
        color: this.getColor(tagLower, slug, hasOwn),
        icon: null,
        website: null,
        aliases: getAliases(tag.name),
        keywords: getKeywords(tag.name),
        popularity: tag.count,
      });
    }

    this.logger.log(`Parsed ${parsed.length} skills from Stack Overflow tags`);
    return parsed;
  }

  private getCategory(
    tagLower: string,
    slug: string,
    hasOwn: (obj: Record<string, unknown>, key: string) => boolean,
  ): { type: SkillType; niche: string | null } {
    return (
      (hasOwn(SKILL_CATEGORIES, tagLower)
        ? SKILL_CATEGORIES[tagLower]
        : null) ||
      (hasOwn(SKILL_CATEGORIES, slug) ? SKILL_CATEGORIES[slug] : null) || {
        type: 'OTHER' as SkillType,
        niche: null,
      }
    );
  }

  private getTranslation(
    tagLower: string,
    slug: string,
    name: string,
    hasOwn: (obj: Record<string, unknown>, key: string) => boolean,
  ): string {
    return (
      (hasOwn(SKILL_TRANSLATIONS, tagLower)
        ? SKILL_TRANSLATIONS[tagLower]
        : null) ||
      (hasOwn(SKILL_TRANSLATIONS, slug) ? SKILL_TRANSLATIONS[slug] : null) ||
      formatDisplayName(name)
    );
  }

  private getColor(
    tagLower: string,
    slug: string,
    hasOwn: (obj: Record<string, unknown>, key: string) => boolean,
  ): string | null {
    return (
      (hasOwn(SKILL_COLORS, tagLower) ? SKILL_COLORS[tagLower] : null) ||
      (hasOwn(SKILL_COLORS, slug) ? SKILL_COLORS[slug] : null) ||
      null
    );
  }
}
