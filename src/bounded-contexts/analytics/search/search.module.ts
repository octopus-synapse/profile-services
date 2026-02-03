/**
 * Search Module
 *
 * Provides full-text search capabilities for resumes.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { ResumeSearchService } from './resume-search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SearchController],
  providers: [ResumeSearchService],
  exports: [ResumeSearchService],
})
export class SearchModule {}
