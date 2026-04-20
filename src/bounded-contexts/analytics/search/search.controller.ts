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

import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { createZodPipe } from '@/bounded-contexts/platform/common/validation/zod-validation.pipe';
import { SEARCH_SERVICE_PORT, type SearchServicePort } from './ports';
import type { SearchParams } from './resume-search.service';
import { parseCsvQuery } from './search.presenter';

const SearchQuerySchema = z.object({
  q: z.string().max(500).optional(),
  skills: z.string().max(500).optional(),
  location: z.string().max(200).optional(),
  minExp: z.coerce.number().int().min(0).max(80).optional(),
  maxExp: z.coerce.number().int().min(0).max(80).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['relevance', 'date', 'views']).optional(),
});

const SuggestionsQuerySchema = z.object({
  prefix: z.string().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const SimilarQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(5),
});

/** DTO for search result item */
export class SearchResultItemDto {
  @ApiProperty({ example: 'clxyz123' })
  id!: string;

  @ApiProperty({ example: 'user123' })
  userId!: string;

  @ApiProperty({ example: 'John Doe', nullable: true })
  fullName!: string | null;

  @ApiProperty({ example: 'Senior Developer', nullable: true })
  jobTitle!: string | null;

  @ApiProperty({ example: 'Experienced developer...', nullable: true })
  summary!: string | null;

  @ApiProperty({ example: 'john-doe', nullable: true })
  slug!: string | null;

  @ApiProperty({ example: 'San Francisco, CA', nullable: true })
  location!: string | null;

  @ApiProperty({ example: 150 })
  profileViews!: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: ['TypeScript', 'React'], required: false })
  skills?: string[];

  @ApiProperty({ example: 0.95, required: false })
  rank?: number;
}

/** DTO for search results response */
export class SearchResultsResponseDto {
  @ApiProperty({ type: [SearchResultItemDto] })
  data!: SearchResultItemDto[];

  @ApiProperty({ example: 100 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 5 })
  totalPages!: number;
}

/** DTO for search suggestions response */
export class SearchSuggestionsResponseDto {
  @ApiProperty({ example: ['JavaScript', 'Java', 'JavaFX'] })
  suggestions!: string[];
}

/** DTO for similar resumes response */
export class SimilarResumesResponseDto {
  @ApiProperty({ example: [], type: [SearchResultItemDto] })
  resumes!: SearchResultItemDto[];
}

@SdkExport({
  tag: 'search',
  description: 'Resume Search API',
  requiresAuth: false,
})
@ApiTags('search')
@Controller('search')
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class SearchController {
  constructor(
    @Inject(SEARCH_SERVICE_PORT)
    private readonly searchService: SearchServicePort,
  ) {}

  /**
   * Search public resumes
   */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Search public resumes' })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Free-text query (max 500)' })
  @ApiQuery({ name: 'skills', required: false, type: String, description: 'Comma-separated' })
  @ApiQuery({ name: 'location', required: false, type: String })
  @ApiQuery({ name: 'minExp', required: false, type: Number })
  @ApiQuery({ name: 'maxExp', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Default 1, max 1000' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Default 20, max 100' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['relevance', 'date', 'views'] })
  @ApiDataResponse(SearchResultsResponseDto, {
    description: 'Search results returned',
  })
  async search(
    @Query(createZodPipe(SearchQuerySchema)) q: z.infer<typeof SearchQuerySchema>,
  ): Promise<DataResponse<SearchResultsResponseDto>> {
    const params: SearchParams = {
      query: q.q || '',
      skills: parseCsvQuery(q.skills),
      location: q.location,
      minExperienceYears: q.minExp,
      maxExperienceYears: q.maxExp,
      page: q.page,
      limit: q.limit,
      sortBy: q.sortBy,
    };

    const result = await this.searchService.search(params);
    return { success: true, data: result };
  }

  /**
   * Get autocomplete suggestions
   */
  @Public()
  @Get('suggestions')
  @ApiOperation({ summary: 'Get search autocomplete suggestions' })
  @ApiQuery({ name: 'prefix', required: false, type: String, description: 'Max 50 chars' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Default 10, max 50' })
  @ApiDataResponse(SearchSuggestionsResponseDto, {
    description: 'Suggestions returned',
  })
  async suggestions(
    @Query(createZodPipe(SuggestionsQuerySchema)) q: z.infer<typeof SuggestionsQuerySchema>,
  ): Promise<DataResponse<SearchSuggestionsResponseDto>> {
    const suggestions = await this.searchService.suggest(q.prefix || '', q.limit);
    return { success: true, data: { suggestions } };
  }

  /**
   * Find similar resumes
   */
  @Public()
  @Get('similar/:id')
  @ApiOperation({ summary: 'Find similar resumes by resume id' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Default 5, max 50' })
  @ApiDataResponse(SimilarResumesResponseDto, {
    description: 'Similar resumes returned',
  })
  async similar(
    @Param('id') id: string,
    @Query(createZodPipe(SimilarQuerySchema)) q: z.infer<typeof SimilarQuerySchema>,
  ): Promise<DataResponse<SimilarResumesResponseDto>> {
    const resumes = await this.searchService.findSimilar(id, q.limit);
    return { success: true, data: { resumes } };
  }
}
