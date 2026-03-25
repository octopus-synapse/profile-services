/**
 * Tech Skill Controller
 * Endpoints for tech skills
 */

import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiProperty, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { TechSkillDto } from '@/shared-kernel';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import type { TechSkill } from '../dtos';
import type { SkillType } from '../interfaces';
import { SkillQueryService } from '../services/skill-query.service';
import { SkillSearchService } from '../services/skill-search.service';
import { TechSkillsQueryService } from '../services/tech-skills-query.service';

class TechSkillListDataDto {
  @ApiProperty({ type: [TechSkillDto] })
  skills!: TechSkill[];
}

@SdkExport({
  tag: 'tech-skills',
  description: 'Tech Skills API',
  requiresAuth: false,
})
@ApiTags('tech-skills')
@Controller('v1/tech-skills')
export class TechSkillController {
  constructor(
    private readonly skillQuery: SkillQueryService,
    private readonly skillSearch: SkillSearchService,
    private readonly queryService: TechSkillsQueryService,
  ) {}

  /** Get all skills */
  @Get()
  @RequirePermission(Permission.SKILL_READ)
  @ApiOperation({ summary: 'Get all tech skills' })
  @ApiDataResponse(TechSkillListDataDto, { description: 'List of tech skills' })
  async getSkills(): Promise<DataResponse<TechSkillListDataDto>> {
    const skills = await this.skillQuery.getAllSkills();
    return { success: true, data: { skills } };
  }

  /** Search skills */
  @Get('search')
  @RequirePermission(Permission.SKILL_READ)
  @ApiDataResponse(TechSkillListDataDto, { description: 'Search results' })
  async searchSkills(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ): Promise<DataResponse<TechSkillListDataDto>> {
    const skills = await this.skillSearch.searchSkills(query, limit ? parseInt(limit, 10) : 20);
    return { success: true, data: { skills } };
  }

  /** Get skills by type */
  @Get('type/:type')
  @RequirePermission(Permission.SKILL_READ)
  @ApiOperation({ summary: 'Get skills by type' })
  @ApiParam({ name: 'type', description: 'Skill type', type: String })
  @ApiDataResponse(TechSkillListDataDto, {
    description: 'List of skills by type',
  })
  async getSkillsByType(
    @Param('type') type: SkillType,
    @Query('limit') limit?: string,
  ): Promise<DataResponse<TechSkillListDataDto>> {
    const skills = await this.queryService.getSkillsByType(type, limit ? parseInt(limit, 10) : 50);
    return { success: true, data: { skills } };
  }
}
