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
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { ResumeSearchService, SearchParams } from './resume-search.service';

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
export class SearchController {
  constructor(private readonly searchService: ResumeSearchService) {}

  /**
   * Search public resumes
   */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Search public resumes' })
  @ApiDataResponse(SearchResultsResponseDto, {
    description: 'Search results returned',
  })
  async search(
    @Query('q') query: string,
    @Query('skills') skills?: string,
    @Query('location') location?: string,
    @Query('minExp') minExp?: string,
    @Query('maxExp') maxExp?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: 'relevance' | 'date' | 'views',
  ): Promise<DataResponse<SearchResultsResponseDto>> {
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

    const result = await this.searchService.search(params);
    return { success: true, data: result };
  }

  /**
   * Get autocomplete suggestions
   */
  @Public()
  @Get('suggestions')
  @ApiOperation({ summary: 'Get search autocomplete suggestions' })
  @ApiDataResponse(SearchSuggestionsResponseDto, {
    description: 'Suggestions returned',
  })
  async suggestions(
    @Query('prefix') prefix: string,
    @Query('limit') limit?: string,
  ): Promise<DataResponse<SearchSuggestionsResponseDto>> {
    const suggestions = await this.searchService.suggest(
      prefix || '',
      limit ? parseInt(limit, 10) : 10,
    );

    return { success: true, data: { suggestions } };
  }

  /**
   * Find similar resumes
   */
  @Public()
  @Get('similar/:id')
  @ApiOperation({ summary: 'Find similar resumes by resume id' })
  @ApiDataResponse(SimilarResumesResponseDto, {
    description: 'Similar resumes returned',
  })
  async similar(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ): Promise<DataResponse<SimilarResumesResponseDto>> {
    const resumes = await this.searchService.findSimilar(id, limit ? parseInt(limit, 10) : 5);

    return { success: true, data: { resumes } };
  }
}
