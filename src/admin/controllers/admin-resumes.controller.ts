/**
 * Admin Resumes Controller
 * Single Responsibility: Admin operations for resume management
 */

import {
  Controller,
  Get,
  Delete,
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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminResumesController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users/:userId/resumes')
  @ApiOperation({ summary: 'Get all resumes for a user (Admin only)' })
  @ApiResponse({ status: 200, description: 'Resumes retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserResumes(@Param('userId') userId: string) {
    return this.adminService.getUserResumes(userId);
  }

  @Get('resumes/:resumeId')
  @ApiOperation({ summary: 'Get resume by ID with all details (Admin only)' })
  @ApiResponse({ status: 200, description: 'Resume retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async getResumeById(@Param('resumeId') resumeId: string) {
    return this.adminService.getResumeById(resumeId);
  }

  @Delete('resumes/:resumeId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete resume (Admin only)' })
  @ApiResponse({ status: 200, description: 'Resume deleted successfully' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async deleteResume(@Param('resumeId') resumeId: string) {
    return this.adminService.deleteResume(resumeId);
  }
}
