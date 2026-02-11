/**
 * Stack Overflow Tags Parser Service
 *
 * Fetches popular tech skills from Stack Overflow tags API
 * and parses them into structured skill data.
 */

import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import {
  STACKOVERFLOW_CATEGORIES,
  STACKOVERFLOW_COLORS,
  STACKOVERFLOW_TRANSLATIONS,
} from '../constants';
import type { ParsedSkill, SkillType, StackOverflowResponse } from '../interfaces';
import {
  formatDisplayName,
  getAliases,
  getKeywords,
  normalizeSlug,
  shouldIncludeStackOverflowTag,
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

        const data = (await response.json()) as StackOverflowResponse;
        for (const tag of data.items) {
          allTags.push({ name: tag.name, count: tag.count });
        }

        if (!data.has_more) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      return this.parseTags(allTags);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to fetch Stack Overflow tags', err.message);
      throw err;
    }
  }

  /**
   * Parse tags into structured skill data
   */
  private parseTags(tags: { name: string; count: number }[]): ParsedSkill[] {
    const parsed: ParsedSkill[] = [];
    const seenSlugs = new Set<string>();
    const hasOwn = (obj: Record<string, unknown>, key: string): boolean => {
      return Object.hasOwn(obj, key);
    };

    for (const tag of tags) {
      const slug = normalizeSlug(tag.name);
      const tagLower = tag.name.toLowerCase();

      if (seenSlugs.has(slug)) continue;
      if (!shouldIncludeStackOverflowTag(tag.name)) continue;

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
      (hasOwn(STACKOVERFLOW_CATEGORIES, tagLower) ? STACKOVERFLOW_CATEGORIES[tagLower] : null) ??
      (hasOwn(STACKOVERFLOW_CATEGORIES, slug) ? STACKOVERFLOW_CATEGORIES[slug] : null) ?? {
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
      (hasOwn(STACKOVERFLOW_TRANSLATIONS, tagLower)
        ? STACKOVERFLOW_TRANSLATIONS[tagLower]
        : null) ??
      (hasOwn(STACKOVERFLOW_TRANSLATIONS, slug) ? STACKOVERFLOW_TRANSLATIONS[slug] : null) ??
      formatDisplayName(name)
    );
  }

  private getColor(
    tagLower: string,
    slug: string,
    hasOwn: (obj: Record<string, unknown>, key: string) => boolean,
  ): string | null {
    return (
      (hasOwn(STACKOVERFLOW_COLORS, tagLower) ? STACKOVERFLOW_COLORS[tagLower] : null) ??
      (hasOwn(STACKOVERFLOW_COLORS, slug) ? STACKOVERFLOW_COLORS[slug] : null) ??
      null
    );
  }
}
