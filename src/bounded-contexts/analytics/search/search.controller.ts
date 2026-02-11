/**
 * Search Controller
 *
 * REST endpoints for resume search.
 *
 * Endpoints:
 * - GET /search - Search public resumes
 * - GET /search/suggestions - Autocomplete suggestions
 * - GET /search/similar/:id - Find similar resumes
 */

import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '@/bounded-contexts/identity/auth/decorators/public.decorator';
import { ResumeSearchService, SearchParams } from './resume-search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: ResumeSearchService) {}

  /**
   * Search public resumes
   */
  @Public()
  @Get()
  async search(
    @Query('q') query: string,
    @Query('skills') skills?: string,
    @Query('location') location?: string,
    @Query('minExp') minExp?: string,
    @Query('maxExp') maxExp?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: 'relevance' | 'date' | 'views',
  ) {
    const params: SearchParams = {
      query: query || '',
      skills: skills ? skills.split(',').map((s) => s.trim()) : undefined,
      location,
      minExperienceYears: minExp ? parseInt(minExp, 10) : undefined,
      maxExperienceYears: maxExp ? parseInt(maxExp, 10) : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      sortBy: sortBy,
    };

    return this.searchService.search(params);
  }

  /**
   * Get autocomplete suggestions
   */
  @Public()
  @Get('suggestions')
  async suggestions(@Query('prefix') prefix: string, @Query('limit') limit?: string) {
    const suggestions = await this.searchService.suggest(
      prefix || '',
      limit ? parseInt(limit, 10) : 10,
    );

    return { suggestions };
  }

  /**
   * Find similar resumes
   */
  @Public()
  @Get('similar/:id')
  async similar(@Param('id') id: string, @Query('limit') limit?: string) {
    const resumes = await this.searchService.findSimilar(id, limit ? parseInt(limit, 10) : 5);

    return { resumes };
  }
}
