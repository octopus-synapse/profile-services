/**
 * Admin Skills Controller
 * Single Responsibility: Admin operations for skill management
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
import { AdminService } from '../admin.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';

@ApiTags('admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminSkillsController {
  constructor(private readonly adminService: AdminService) {}

  @Get('resumes/:resumeId/skills')
  @ApiOperation({ summary: 'Get all skills for a resume (Admin only)' })
  @ApiResponse({ status: 200, description: 'Skills retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async getResumeSkills(@Param('resumeId') resumeId: string) {
    return this.adminService.getResumeSkills(resumeId);
  }

  @Post('resumes/:resumeId/skills')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add skill to resume (Admin only)' })
  @ApiResponse({ status: 201, description: 'Skill added successfully' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async addSkillToResume(
    @Param('resumeId') resumeId: string,
    @Body() skillData: { name: string; category: string; level?: number },
  ) {
    return this.adminService.addSkillToResume(resumeId, skillData);
  }

  @Patch('skills/:skillId')
  @ApiOperation({ summary: 'Update skill (Admin only)' })
  @ApiResponse({ status: 200, description: 'Skill updated successfully' })
  @ApiResponse({ status: 404, description: 'Skill not found' })
  async updateSkill(
    @Param('skillId') skillId: string,
    @Body() skillData: { name?: string; category?: string; level?: number },
  ) {
    return this.adminService.updateSkill(skillId, skillData);
  }

  @Delete('skills/:skillId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete skill (Admin only)' })
  @ApiResponse({ status: 200, description: 'Skill deleted successfully' })
  @ApiResponse({ status: 404, description: 'Skill not found' })
  async deleteSkill(@Param('skillId') skillId: string) {
    return this.adminService.deleteSkill(skillId);
  }
}
