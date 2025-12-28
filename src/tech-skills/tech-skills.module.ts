/**
 * Tech Skills Module
 * Handles tech skills, programming languages, areas, and niches
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TechSkillsController } from './tech-skills.controller';
import { TechSkillsSyncService } from './services/tech-skills-sync.service';
import { TechSkillsQueryService } from './services/tech-skills-query.service';
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
    GithubLinguistParserService,
    StackOverflowParserService,
    InternalAuthGuard,
  ],
  exports: [TechSkillsSyncService, TechSkillsQueryService],
})
export class TechSkillsModule {}
