/**
 * Tech Skills Module
 * Handles tech skills, programming languages, areas, and niches
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  TechSkillsSyncController,
  TechSkillsQueryController,
  TechAreaController,
  TechNicheController,
  TechSkillController,
} from './controllers';
import { TechSkillsRepository } from './repositories';
import { TechSkillsSyncService } from './services/tech-skills-sync.service';
import { TechSkillsQueryService } from './services/tech-skills-query.service';
import { TechAreaQueryService } from './services/area-query.service';
import { TechNicheQueryService } from './services/niche-query.service';
import { LanguageQueryService } from './services/language-query.service';
import { SkillQueryService } from './services/skill-query.service';
import { SkillSearchService } from './services/skill-search.service';
import { GithubLinguistParserService } from './services/github-linguist-parser.service';
import { StackOverflowParserService } from './services/stackoverflow-parser.service';
import { TechAreasSyncService } from './services/tech-areas-sync.service';
import { TechNichesSyncService } from './services/tech-niches-sync.service';
import { LanguagesSyncService } from './services/languages-sync.service';
import { SkillsDataSyncService } from './services/skills-data-sync.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InternalAuthGuard } from '../mec-sync/guards/internal-auth.guard';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [
    TechSkillsSyncController,
    TechSkillsQueryController,
    TechAreaController,
    TechNicheController,
    TechSkillController,
  ],
  providers: [
    // Repository
    TechSkillsRepository,
    // Sync services
    TechAreasSyncService,
    TechNichesSyncService,
    LanguagesSyncService,
    SkillsDataSyncService,
    TechSkillsSyncService,
    // Query services
    TechSkillsQueryService,
    TechAreaQueryService,
    TechNicheQueryService,
    LanguageQueryService,
    SkillQueryService,
    SkillSearchService,
    // Parser services
    GithubLinguistParserService,
    StackOverflowParserService,
    // Guards
    InternalAuthGuard,
  ],
  exports: [TechSkillsSyncService, TechSkillsQueryService],
})
export class TechSkillsModule {}
