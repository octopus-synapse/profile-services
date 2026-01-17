/**
 * Search Module
 *
 * Provides full-text search capabilities for resumes.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ResumeSearchService } from './resume-search.service';
import { SearchController } from './search.controller';
import { ResumeSearchRepository } from './repositories';

@Module({
  imports: [PrismaModule],
  controllers: [SearchController],
  providers: [ResumeSearchService, ResumeSearchRepository],
  exports: [ResumeSearchService],
})
export class SearchModule {}
