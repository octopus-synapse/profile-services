/**
 * Tech Skills Query Controller
 * Public API endpoints for querying tech skills, languages, areas, and niches
 */

import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import {
  ProgrammingLanguageListDataDto,
  TechAreaListDataDto,
  TechNicheListDataDto,
  TechSearchResultsDataDto,
  TechSkillListDataDto,
} from '../dto/controller-response.dto';
import type { SkillType, TechAreaType } from '../interfaces';
import { TechSkillsQueryService } from '../services/tech-skills-query.service';

@ApiTags('tech-skills-query')
@Controller('v1/tech-skills')
export class TechSkillsQueryController {
  constructor(private readonly queryService: TechSkillsQueryService) {}

  /** Get all tech areas */
  @Get('areas')
  @RequirePermission(Permission.SKILL_READ)
  @ApiOperation({ summary: 'Get all tech areas' })
  @ApiDataResponse(TechAreaListDataDto, { description: 'Tech areas returned' })
  async getAreas(): Promise<DataResponse<TechAreaListDataDto>> {
    const areas = await this.queryService.getAllAreas();
    return { success: true, data: { areas } };
  }

  /** Get all tech niches */
  @Get('niches')
  @RequirePermission(Permission.SKILL_READ)
  @ApiOperation({ summary: 'Get all tech niches' })
  @ApiDataResponse(TechNicheListDataDto, {
    description: 'Tech niches returned',
  })
  async getNiches(): Promise<DataResponse<TechNicheListDataDto>> {
    const niches = await this.queryService.getAllNiches();
    return { success: true, data: { niches } };
  }

  /** Get niches by area type */
  @Get('areas/:areaType/niches')
  @RequirePermission(Permission.SKILL_READ)
  @ApiOperation({ summary: 'Get niches by tech area type' })
  @ApiParam({ name: 'areaType', description: 'Tech area type', type: String })
  @ApiDataResponse(TechNicheListDataDto, {
    description: 'Niches by area returned',
  })
  async getNichesByArea(
    @Param('areaType') areaType: TechAreaType,
  ): Promise<DataResponse<TechNicheListDataDto>> {
    const niches = await this.queryService.getNichesByArea(areaType);
    return { success: true, data: { niches } };
  }

  /** Get all programming languages */
  @Get('languages')
  @RequirePermission(Permission.SKILL_READ)
  @ApiOperation({ summary: 'Get all programming languages' })
  @ApiDataResponse(ProgrammingLanguageListDataDto, {
    description: 'Programming languages returned',
  })
  async getLanguages(): Promise<DataResponse<ProgrammingLanguageListDataDto>> {
    const languages = await this.queryService.getAllLanguages();
    return { success: true, data: { languages } };
  }

  /** Search programming languages */
  @Get('languages/search')
  @RequirePermission(Permission.SKILL_READ)
  @ApiOperation({ summary: 'Search programming languages' })
  @ApiDataResponse(ProgrammingLanguageListDataDto, {
    description: 'Programming language search results returned',
  })
  async searchLanguages(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ): Promise<DataResponse<ProgrammingLanguageListDataDto>> {
    const languages = await this.queryService.searchLanguages(
      query,
      limit ? parseInt(limit, 10) : 20,
    );
    return { success: true, data: { languages } };
  }

  /** Get all skills */
  @Get('skills')
  @RequirePermission(Permission.SKILL_READ)
  @ApiOperation({ summary: 'Get all tech skills' })
  @ApiDataResponse(TechSkillListDataDto, {
    description: 'Tech skills returned',
  })
  async getSkills(): Promise<DataResponse<TechSkillListDataDto>> {
    const skills = await this.queryService.getAllSkills();
    return { success: true, data: { skills } };
  }

  /** Search skills */
  @Get('skills/search')
  @RequirePermission(Permission.SKILL_READ)
  @ApiOperation({ summary: 'Search tech skills' })
  @ApiDataResponse(TechSkillListDataDto, {
    description: 'Tech skill search results returned',
  })
  async searchSkills(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ): Promise<DataResponse<TechSkillListDataDto>> {
    const skills = await this.queryService.searchSkills(query, limit ? parseInt(limit, 10) : 20);
    return { success: true, data: { skills } };
  }

  /** Get skills by niche */
  @Get('niches/:nicheSlug/skills')
  @RequirePermission(Permission.SKILL_READ)
  @ApiOperation({ summary: 'Get skills by niche' })
  @ApiParam({ name: 'nicheSlug', description: 'Niche slug', type: String })
  @ApiDataResponse(TechSkillListDataDto, {
    description: 'Skills by niche returned',
  })
  async getSkillsByNiche(
    @Param('nicheSlug') nicheSlug: string,
  ): Promise<DataResponse<TechSkillListDataDto>> {
    const skills = await this.queryService.getSkillsByNiche(nicheSlug);
    return { success: true, data: { skills } };
  }

  /** Get skills by type */
  @Get('skills/type/:type')
  @RequirePermission(Permission.SKILL_READ)
  @ApiOperation({ summary: 'Get skills by type' })
  @ApiParam({ name: 'type', description: 'Skill type', type: String })
  @ApiDataResponse(TechSkillListDataDto, {
    description: 'Skills by type returned',
  })
  async getSkillsByType(
    @Param('type') type: SkillType,
    @Query('limit') limit?: string,
  ): Promise<DataResponse<TechSkillListDataDto>> {
    const skills = await this.queryService.getSkillsByType(type, limit ? parseInt(limit, 10) : 50);
    return { success: true, data: { skills } };
  }

  /** Combined search (languages + skills) */
  @Get('search')
  @RequirePermission(Permission.SKILL_READ)
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
