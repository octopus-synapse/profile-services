/**
 * GitHub Linguist Parser Service
 * Parses programming languages from GitHub's Linguist repository
 */

import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import * as yaml from 'js-yaml';
import type { GithubLanguagesYml, ParsedLanguage } from '../interfaces';
import {
  LANGUAGE_METADATA,
  GITHUB_LINGUIST_URL,
} from '../constants/language-metadata.const';
import { createLanguageSlug } from '../utils';

@Injectable()
export class GithubLinguistParserService {
  constructor(private readonly logger: AppLoggerService) {}

  /** Fetch and parse languages from GitHub Linguist */
  async fetchAndParse(): Promise<ParsedLanguage[]> {
    this.logger.log('Fetching GitHub Linguist languages...');

    try {
      const response = await fetch(GITHUB_LINGUIST_URL);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch: ${response.status} ${response.statusText}`,
        );
      }

      const yamlContent = await response.text();
      const languages = yaml.load(yamlContent) as GithubLanguagesYml;

      return this.parseLanguages(languages);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to fetch GitHub Linguist', err.message);
      throw err;
    }
  }

  /** Parse YAML content into structured language data */
  private parseLanguages(languages: GithubLanguagesYml): ParsedLanguage[] {
    const parsed: ParsedLanguage[] = [];

    for (const [name, lang] of Object.entries(languages)) {
      if (lang.type !== 'programming') continue;

      const popularityIndex = LANGUAGE_METADATA.popularityOrder.indexOf(name);

      parsed.push({
        slug: createLanguageSlug(name),
        nameEn: name,
        namePtBr: LANGUAGE_METADATA.translations[name] ?? name,
        color: lang.color ?? null,
        extensions: lang.extensions ?? [],
        aliases: lang.aliases ?? [],
        paradigms: LANGUAGE_METADATA.paradigms[name] ?? [],
        typing: LANGUAGE_METADATA.typing[name] ?? null,
        website: LANGUAGE_METADATA.websites[name] ?? null,
        popularity: popularityIndex >= 0 ? 1000 - popularityIndex : 0,
      });
    }

    parsed.sort((a, b) => b.popularity - a.popularity);

    this.logger.log(`Parsed ${parsed.length} programming languages`);
    return parsed;
  }
}
