/**
 * Tech Skills Sync Service (Facade)
 * Orchestrates synchronization of tech skills from external sources
 * Delegates to specialized services for implementation
 */

import { Injectable } from '@nestjs/common';
import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { GithubLinguistParserService } from './github-linguist-parser.service';
import { StackOverflowParserService } from './stackoverflow-parser.service';
import { TechAreasSyncService } from './tech-areas-sync.service';
import { TechNichesSyncService } from './tech-niches-sync.service';
import { LanguagesSyncService } from './languages-sync.service';
import { SkillsDataSyncService } from './skills-data-sync.service';
import type { TechSkillsSyncResult } from '../interfaces';

@Injectable()
export class TechSkillsSyncService {
  constructor(
    private readonly cache: CacheService,
    private readonly logger: AppLoggerService,
    private readonly linguistParser: GithubLinguistParserService,
    private readonly stackOverflowParser: StackOverflowParserService,
    private readonly techAreasSync: TechAreasSyncService,
    private readonly techNichesSync: TechNichesSyncService,
    private readonly languagesSync: LanguagesSyncService,
    private readonly skillsDataSync: SkillsDataSyncService,
  ) {}

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
      result.areasCreated = await this.techAreasSync.syncAreas();
      this.logger.log(
        `Tech areas synced: ${result.areasCreated} created/updated`,
      );

      result.nichesCreated = await this.techNichesSync.syncNiches();
      this.logger.log(
        `Tech niches synced: ${result.nichesCreated} created/updated`,
      );

      const languages = await this.linguistParser.fetchAndParse();
      const langResult = await this.languagesSync.syncLanguages(languages);
      result.languagesInserted = langResult.inserted;
      result.languagesUpdated = langResult.updated;
      this.logger.log(
        `Languages synced: ${langResult.inserted} inserted, ${langResult.updated} updated`,
      );

      const skills = await this.stackOverflowParser.fetchAndParse();
      const skillResult = await this.skillsDataSync.syncSkills(skills);
      result.skillsInserted = skillResult.inserted;
      result.skillsUpdated = skillResult.updated;
      this.logger.log(
        `Skills synced: ${skillResult.inserted} inserted, ${skillResult.updated} updated`,
      );

      await this.clearCache();
      this.logger.log('Tech skills sync completed successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Tech skills sync failed', errorMessage);
      result.errors.push(errorMessage);
    }

    return result;
  }

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
