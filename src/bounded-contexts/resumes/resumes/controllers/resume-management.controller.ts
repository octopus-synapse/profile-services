/**
 * Resume Management Controller
 *
 * Endpoints for managing resumes with elevated permissions.
 * Protected by permission system - any role with required permissions can access.
 *
 * Single Responsibility: HTTP interface for resume management operations.
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
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import {
  PermissionGuard,
  RequirePermission,
} from '@/bounded-contexts/identity/authorization';
import { ResumeManagementService } from '../services/resume-management.service';

@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('v1/resumes/manage')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ResumeManagementController {
  constructor(private readonly resumeManagement: ResumeManagementService) {}

  @Get('user/:userId')
  @RequirePermission('resume', 'read')
  @ApiOperation({ summary: 'List all resumes for a specific user' })
  @ApiResponse({ status: 200, description: 'Resumes retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async listResumesForUser(@Param('userId') userId: string) {
    return this.resumeManagement.listResumesForUser(userId);
  }

  @Get(':id')
  @RequirePermission('resume', 'read')
  @ApiOperation({ summary: 'Get full resume details' })
  @ApiResponse({ status: 200, description: 'Resume retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async getResumeDetails(@Param('id') resumeId: string) {
    return this.resumeManagement.getResumeDetails(resumeId);
  }

  @Delete(':id')
  @RequirePermission('resume', 'delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a resume' })
  @ApiResponse({ status: 200, description: 'Resume deleted successfully' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async deleteResume(@Param('id') resumeId: string) {
    return this.resumeManagement.deleteResume(resumeId);
  }
}
