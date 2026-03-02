/**
 * Skill Management Controller
 *
 * Endpoints for managing skills with elevated permissions.
 * Protected by permission system - any role with required permissions can access.
 *
 * Single Responsibility: HTTP interface for skill management operations.
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { PermissionGuard, RequirePermission } from '@/bounded-contexts/identity/authorization';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { DeleteResponseDto, ResumeSkillResponseDto } from '@/shared-kernel';
import {
  CreateSkillInput,
  SkillManagementService,
  UpdateSkillInput,
} from '../services/skill-management.service';

class ResumeSkillListDataDto {
  @ApiProperty({ type: [ResumeSkillResponseDto] })
  skills!: ResumeSkillResponseDto[];
}

class ResumeSkillDataDto {
  @ApiProperty({ type: ResumeSkillResponseDto })
  skill!: ResumeSkillResponseDto;
}

class DeleteSkillDataDto {
  @ApiProperty({ type: DeleteResponseDto })
  result!: { deleted: boolean };
}

@SdkExport({ tag: 'skills', description: 'Skills API' })
@ApiTags('skills')
@ApiBearerAuth('JWT-auth')
@Controller('v1/skills/manage')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SkillManagementController {
  constructor(private readonly skillManagement: SkillManagementService) {}

  @Get('resume/:resumeId')
  @RequirePermission('skill', 'read')
  @ApiOperation({ summary: 'List all skills for a resume' })
  @ApiDataResponse(ResumeSkillListDataDto, {
    description: 'Skills retrieved successfully',
  })
  async listSkillsForResume(
    @Param('resumeId') resumeId: string,
  ): Promise<DataResponse<ResumeSkillListDataDto>> {
    const skills = await this.skillManagement.listSkillsForResume(resumeId);
    return {
      success: true,
      data: { skills: skills as unknown as ResumeSkillResponseDto[] },
    };
  }

  @Post('resume/:resumeId')
  @RequirePermission('skill', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a skill to a resume' })
  @ApiDataResponse(ResumeSkillDataDto, {
    description: 'Skill added successfully',
    status: HttpStatus.CREATED,
  })
  async addSkillToResume(
    @Param('resumeId') resumeId: string,
    @Body() data: CreateSkillInput,
  ): Promise<DataResponse<ResumeSkillDataDto>> {
    const skill = await this.skillManagement.addSkillToResume(resumeId, data);
    return {
      success: true,
      data: { skill: skill as unknown as ResumeSkillResponseDto },
    };
  }

  @Patch(':id')
  @RequirePermission('skill', 'update')
  @ApiOperation({ summary: 'Update a skill' })
  @ApiDataResponse(ResumeSkillDataDto, {
    description: 'Skill updated successfully',
  })
  async updateSkill(
    @Param('id') skillId: string,
    @Body() data: UpdateSkillInput,
  ): Promise<DataResponse<ResumeSkillDataDto>> {
    const skill = await this.skillManagement.updateSkill(skillId, data);
    return {
      success: true,
      data: { skill: skill as unknown as ResumeSkillResponseDto },
    };
  }

  @Delete(':id')
  @RequirePermission('skill', 'delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a skill' })
  @ApiDataResponse(DeleteSkillDataDto, {
    description: 'Skill deleted successfully',
  })
  async deleteSkill(@Param('id') skillId: string): Promise<DataResponse<DeleteSkillDataDto>> {
    const result = await this.skillManagement.deleteSkill(skillId);
    return { success: true, data: { result: { deleted: result.success } } };
  }
}
