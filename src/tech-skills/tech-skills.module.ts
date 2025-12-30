/**
 * Tech Skills Module
 * Handles tech skills, programming languages, areas, and niches
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TechSkillsController } from './tech-skills.controller';
import { TechSkillsSyncService } from './services/tech-skills-sync.service';
import { TechSkillsQueryService } from './services/tech-skills-query.service';
import { TechAreaQueryService } from './services/area-query.service';
import { TechNicheQueryService } from './services/niche-query.service';
import { LanguageQueryService } from './services/language-query.service';
import { SkillQueryService } from './services/skill-query.service';
import { SkillSearchService } from './services/skill-search.service';
import { GithubLinguistParserService } from './services/github-linguist-parser.service';
import { StackOverflowParserService } from './services/stackoverflow-parser.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InternalAuthGuard } from '../mec-sync/guards/internal-auth.guard';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [TechSkillsController],
  providers: [
    TechSkillsSyncService,
    TechSkillsQueryService,
    TechAreaQueryService,
    TechNicheQueryService,
    LanguageQueryService,
    SkillQueryService,
    SkillSearchService,
    GithubLinguistParserService,
    StackOverflowParserService,
    InternalAuthGuard,
  ],
  exports: [TechSkillsSyncService, TechSkillsQueryService],
})
export class TechSkillsModule {}
