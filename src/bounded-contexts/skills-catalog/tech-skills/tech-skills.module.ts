/**
 * Tech Skills Module
 * Handles tech skills, programming languages, areas, and niches
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InternalAuthGuard } from '@/bounded-contexts/integration/mec-sync/guards/internal-auth.guard';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import {
  LanguageQueryPort,
  SkillQueryPort,
  SkillSearchPort,
  TechAreaQueryPort,
  TechNicheQueryPort,
} from './application/ports/query-facade.ports';
import {
  TechAreaController,
  TechNicheController,
  TechSkillController,
  TechSkillsQueryController,
  TechSkillsSyncController,
} from './controllers';
import { TechAreaQueryService } from './services/area-query.service';
import { GithubLinguistParserService } from './services/github-linguist-parser.service';
import { LanguageQueryService } from './services/language-query.service';
import { LanguagesSyncService } from './services/languages-sync.service';
import { TechNicheQueryService } from './services/niche-query.service';
import { SkillQueryService } from './services/skill-query.service';
import { SkillSearchService } from './services/skill-search.service';
import { SkillsDataSyncService } from './services/skills-data-sync.service';
import { StackOverflowParserService } from './services/stackoverflow-parser.service';
import { TechAreasSyncService } from './services/tech-areas-sync.service';
import { TechNichesSyncService } from './services/tech-niches-sync.service';
import { TechSkillsQueryService } from './services/tech-skills-query.service';
import { TechSkillsSyncService } from './services/tech-skills-sync.service';

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
    // Query Facade Ports
    { provide: TechAreaQueryPort, useExisting: TechAreaQueryService },
    { provide: TechNicheQueryPort, useExisting: TechNicheQueryService },
    { provide: LanguageQueryPort, useExisting: LanguageQueryService },
    { provide: SkillQueryPort, useExisting: SkillQueryService },
    { provide: SkillSearchPort, useExisting: SkillSearchService },
    // Guards
    InternalAuthGuard,
  ],
  exports: [TechSkillsSyncService, TechSkillsQueryService],
})
export class TechSkillsModule {}
