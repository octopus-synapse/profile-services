import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { RequirePermission } from '@/shared-kernel/authorization';
import { DeleteSkillDataDto, SkillDataDto, SkillsDataDto } from '../dto/controller-response.dto';
import type {
  CreateSkillData,
  UpdateSkillData,
} from '../services/skill-management/ports/skill-management.port';
import { SkillManagementService } from '../services/skill-management.service';

@SdkExport({ tag: 'resume-skills', description: 'Resume skill management' })
@ApiTags('Resume Skills')
@Controller('v1/resumes/:resumeId/skills')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SkillManagementController {
  constructor(private readonly skillManagementService: SkillManagementService) {}

  @Post()
  @RequirePermission('resume', 'update')
  @ApiOperation({ summary: 'Add a skill to a resume' })
  @ApiDataResponse(SkillDataDto, { description: 'Skill created' })
  async addSkillToResume(
    @Param('resumeId') resumeId: string,
    @Body() input: CreateSkillData,
  ): Promise<DataResponse<SkillDataDto>> {
    const skill = await this.skillManagementService.addSkillToResume(resumeId, input);

    return { success: true, data: { skill } };
  }

  @Get()
  @RequirePermission('resume', 'read')
  @ApiOperation({ summary: 'List skills for a resume' })
  @ApiDataResponse(SkillsDataDto, { description: 'Skills returned' })
  async listSkillsForResume(
    @Param('resumeId') resumeId: string,
  ): Promise<DataResponse<SkillsDataDto>> {
    const skills = await this.skillManagementService.listSkillsForResume(resumeId);

    return { success: true, data: { skills } };
  }

  @Patch(':skillId')
  @RequirePermission('resume', 'update')
  @ApiOperation({ summary: 'Update a resume skill' })
  @ApiDataResponse(SkillDataDto, { description: 'Skill updated' })
  async updateSkill(
    @Param('resumeId') _resumeId: string,
    @Param('skillId') skillId: string,
    @Body() input: UpdateSkillData,
  ): Promise<DataResponse<SkillDataDto>> {
    const skill = await this.skillManagementService.updateSkill(skillId, input);

    return { success: true, data: { skill } };
  }

  @Delete(':skillId')
  @RequirePermission('resume', 'update')
  @ApiOperation({ summary: 'Delete a resume skill' })
  @ApiDataResponse(DeleteSkillDataDto, { description: 'Skill deleted' })
  async deleteSkill(
    @Param('resumeId') _resumeId: string,
    @Param('skillId') skillId: string,
  ): Promise<DataResponse<DeleteSkillDataDto>> {
    await this.skillManagementService.deleteSkill(skillId);

    return { success: true, data: { result: { deleted: true } } };
  }
}
