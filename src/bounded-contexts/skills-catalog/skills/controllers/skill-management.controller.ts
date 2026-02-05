/**
 * Skill Management Controller
 *
 * Endpoints for managing skills with elevated permissions.
 * Protected by permission system - any role with required permissions can access.
 *
 * Single Responsibility: HTTP interface for skill management operations.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import {
  PermissionGuard,
  RequirePermission,
} from '@/bounded-contexts/identity/authorization';
import {
  SkillManagementService,
  CreateSkillInput,
  UpdateSkillInput,
} from '../services/skill-management.service';
import {
  DeleteResponseDto,
  ResumeSkillResponseDto,
} from '@/shared-kernel';

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
  @ApiResponse({ status: 200, type: [ResumeSkillResponseDto] })
  @ApiResponse({ status: 200, description: 'Skills retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async listSkillsForResume(@Param('resumeId') resumeId: string) {
    return this.skillManagement.listSkillsForResume(resumeId);
  }

  @Post('resume/:resumeId')
  @RequirePermission('skill', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a skill to a resume' })
  @ApiResponse({ status: 201, type: ResumeSkillResponseDto })
  @ApiResponse({ status: 201, description: 'Skill added successfully' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async addSkillToResume(
    @Param('resumeId') resumeId: string,
    @Body() data: CreateSkillInput,
  ) {
    return this.skillManagement.addSkillToResume(resumeId, data);
  }

  @Patch(':id')
  @RequirePermission('skill', 'update')
  @ApiOperation({ summary: 'Update a skill' })
  @ApiResponse({ status: 200, type: ResumeSkillResponseDto })
  @ApiResponse({ status: 200, description: 'Skill updated successfully' })
  @ApiResponse({ status: 404, description: 'Skill not found' })
  async updateSkill(
    @Param('id') skillId: string,
    @Body() data: UpdateSkillInput,
  ) {
    return this.skillManagement.updateSkill(skillId, data);
  }

  @Delete(':id')
  @RequirePermission('skill', 'delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a skill' })
  @ApiResponse({ status: 200, type: DeleteResponseDto })
  @ApiResponse({ status: 200, description: 'Skill deleted successfully' })
  @ApiResponse({ status: 404, description: 'Skill not found' })
  async deleteSkill(@Param('id') skillId: string) {
    return this.skillManagement.deleteSkill(skillId);
  }
}
