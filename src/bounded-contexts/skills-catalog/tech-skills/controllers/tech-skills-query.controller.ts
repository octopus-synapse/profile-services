/**
 * Tech Skills Query Controller
 * Public API endpoints for querying tech skills, languages, areas, and niches
 */

import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { type ProgrammingLanguage, type TechArea, type TechNiche, type TechSkill } from '../dtos';
import type { SkillType, TechAreaType } from '../interfaces';
import { TechSkillsQueryService } from '../services/tech-skills-query.service';

class TechAreasListDataDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  areas!: TechArea[];
}

class TechNichesListDataDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  niches!: TechNiche[];
}

class TechLanguagesListDataDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  languages!: ProgrammingLanguage[];
}

class TechSkillsListDataDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  skills!: TechSkill[];
}

class TechSearchResultsDataDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  results!: { languages: ProgrammingLanguage[]; skills: TechSkill[] };
}

@ApiTags('tech-skills-query')
@Controller('v1/tech-skills')
export class TechSkillsQueryController {
  constructor(private readonly queryService: TechSkillsQueryService) {}

  /** Get all tech areas */
  @Get('areas')
  @Public()
  @ApiOperation({ summary: 'Get all tech areas' })
  @ApiDataResponse(TechAreasListDataDto, { description: 'Tech areas returned' })
  async getAreas(): Promise<DataResponse<TechAreasListDataDto>> {
    const areas = await this.queryService.getAllAreas();
    return { success: true, data: { areas } };
  }

  /** Get all tech niches */
  @Get('niches')
  @Public()
  @ApiOperation({ summary: 'Get all tech niches' })
  @ApiDataResponse(TechNichesListDataDto, {
    description: 'Tech niches returned',
  })
  async getNiches(): Promise<DataResponse<TechNichesListDataDto>> {
    const niches = await this.queryService.getAllNiches();
    return { success: true, data: { niches } };
  }

  /** Get niches by area type */
  @Get('areas/:areaType/niches')
  @Public()
  @ApiOperation({ summary: 'Get niches by tech area type' })
  @ApiParam({ name: 'areaType', description: 'Tech area type', type: String })
  @ApiDataResponse(TechNichesListDataDto, {
    description: 'Niches by area returned',
  })
  async getNichesByArea(
    @Param('areaType') areaType: TechAreaType,
  ): Promise<DataResponse<TechNichesListDataDto>> {
    const niches = await this.queryService.getNichesByArea(areaType);
    return { success: true, data: { niches } };
  }

  /** Get all programming languages */
  @Get('languages')
  @Public()
  @ApiOperation({ summary: 'Get all programming languages' })
  @ApiDataResponse(TechLanguagesListDataDto, {
    description: 'Programming languages returned',
  })
  async getLanguages(): Promise<DataResponse<TechLanguagesListDataDto>> {
    const languages = await this.queryService.getAllLanguages();
    return { success: true, data: { languages } };
  }

  /** Search programming languages */
  @Get('languages/search')
  @Public()
  @ApiOperation({ summary: 'Search programming languages' })
  @ApiDataResponse(TechLanguagesListDataDto, {
    description: 'Programming language search results returned',
  })
  async searchLanguages(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ): Promise<DataResponse<TechLanguagesListDataDto>> {
    const languages = await this.queryService.searchLanguages(
      query,
      limit ? parseInt(limit, 10) : 20,
    );
    return { success: true, data: { languages } };
  }

  /** Get all skills */
  @Get('skills')
  @Public()
  @ApiOperation({ summary: 'Get all tech skills' })
  @ApiDataResponse(TechSkillsListDataDto, {
    description: 'Tech skills returned',
  })
  async getSkills(): Promise<DataResponse<TechSkillsListDataDto>> {
    const skills = await this.queryService.getAllSkills();
    return { success: true, data: { skills } };
  }

  /** Search skills */
  @Get('skills/search')
  @Public()
  @ApiOperation({ summary: 'Search tech skills' })
  @ApiDataResponse(TechSkillsListDataDto, {
    description: 'Tech skill search results returned',
  })
  async searchSkills(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ): Promise<DataResponse<TechSkillsListDataDto>> {
    const skills = await this.queryService.searchSkills(query, limit ? parseInt(limit, 10) : 20);
    return { success: true, data: { skills } };
  }

  /** Get skills by niche */
  @Get('niches/:nicheSlug/skills')
  @Public()
  @ApiOperation({ summary: 'Get skills by niche' })
  @ApiParam({ name: 'nicheSlug', description: 'Niche slug', type: String })
  @ApiDataResponse(TechSkillsListDataDto, {
    description: 'Skills by niche returned',
  })
  async getSkillsByNiche(
    @Param('nicheSlug') nicheSlug: string,
  ): Promise<DataResponse<TechSkillsListDataDto>> {
    const skills = await this.queryService.getSkillsByNiche(nicheSlug);
    return { success: true, data: { skills } };
  }

  /** Get skills by type */
  @Get('skills/type/:type')
  @Public()
  @ApiOperation({ summary: 'Get skills by type' })
  @ApiParam({ name: 'type', description: 'Skill type', type: String })
  @ApiDataResponse(TechSkillsListDataDto, {
    description: 'Skills by type returned',
  })
  async getSkillsByType(
    @Param('type') type: SkillType,
    @Query('limit') limit?: string,
  ): Promise<DataResponse<TechSkillsListDataDto>> {
    const skills = await this.queryService.getSkillsByType(type, limit ? parseInt(limit, 10) : 50);
    return { success: true, data: { skills } };
  }

  /** Combined search (languages + skills) */
  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Search languages and skills' })
  @ApiDataResponse(TechSearchResultsDataDto, {
    description: 'Combined search results returned',
  })
  async searchAll(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ): Promise<DataResponse<TechSearchResultsDataDto>> {
    const results = await this.queryService.searchAll(query, limit ? parseInt(limit, 10) : 20);
    return { success: true, data: { results } };
  }
}
