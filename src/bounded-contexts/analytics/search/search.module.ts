/**
 * Search Module
 *
 * Provides full-text search capabilities for resumes.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { SearchServicePort } from './ports/search.port';
import { ResumeSearchService } from './resume-search.service';
import { searchRoutes } from './search.routes';

@Module({
  imports: [PrismaModule],
  controllers: synthesizeRouteControllers(SearchServicePort, searchRoutes),
  providers: [
    ResumeSearchService,
    { provide: SearchServicePort, useExisting: ResumeSearchService },
  ],
  exports: [ResumeSearchService],
})
export class SearchModule {}
