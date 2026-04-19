/**
 * Tech Skills Module
 * Handles tech skills, programming languages, areas, and niches
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InternalAuthGuard } from '@/bounded-contexts/integration/mec-sync/guards/internal-auth.guard';
import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  LanguageQueryPort,
  SkillQueryPort,
  SkillSearchPort,
  TechAreaQueryPort,
  TechNicheQueryPort,
} from './application/ports/query-facade.ports';
import { CachePort, TechSkillRepositoryPort } from './application/ports/tech-skills.port';
import {
  TechAreaController,
  TechNicheController,
  TechSkillController,
  TechSkillsQueryController,
  TechSkillsSyncController,
} from './controllers';
import { CacheAdapter } from './infrastructure/adapters/persistence/cache.adapter';
import { TechSkillRepository } from './infrastructure/adapters/persistence/tech-skill.repository';
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
    // Query facade ports → concrete services
    { provide: TechAreaQueryPort, useExisting: TechAreaQueryService },
    { provide: TechNicheQueryPort, useExisting: TechNicheQueryService },
    { provide: LanguageQueryPort, useExisting: LanguageQueryService },
    { provide: SkillQueryPort, useExisting: SkillQueryService },
    { provide: SkillSearchPort, useExisting: SkillSearchService },
    // Repository / cache ports → adapters
    {
      provide: TechSkillRepositoryPort,
      useFactory: (prisma: PrismaService) => new TechSkillRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: CachePort,
      useFactory: (cache: CacheService) => new CacheAdapter(cache),
      inject: [CacheService],
    },
    // Parser services
    GithubLinguistParserService,
    StackOverflowParserService,
    // Guards
    InternalAuthGuard,
  ],
  exports: [TechSkillsSyncService, TechSkillsQueryService],
})
export class TechSkillsModule {}
