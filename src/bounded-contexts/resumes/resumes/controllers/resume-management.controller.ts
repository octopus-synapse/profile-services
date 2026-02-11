/**
 * Resume Management Controller
 *
 * Endpoints for managing resumes with elevated permissions.
 * Protected by permission system - any role with required permissions can access.
 *
 * Single Responsibility: HTTP interface for resume management operations.
 */

import { Controller, Delete, Get, HttpCode, HttpStatus, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { PermissionGuard, RequirePermission } from '@/bounded-contexts/identity/authorization';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { DeleteResponseDto, ResumeFullResponseDto, ResumeListItemDto } from '@/shared-kernel';
import { ResumeManagementService } from '../services/resume-management.service';

@SdkExport({ tag: 'resumes', description: 'Resumes API' })
@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('v1/resumes/manage')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ResumeManagementController {
  constructor(private readonly resumeManagement: ResumeManagementService) {}

  @Get('user/:userId')
  @RequirePermission('resume', 'read')
  @ApiOperation({ summary: 'List all resumes for a specific user' })
  @ApiResponse({ status: 200, type: [ResumeListItemDto] })
  @ApiResponse({ status: 200, description: 'Resumes retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async listResumesForUser(@Param('userId') userId: string) {
    return this.resumeManagement.listResumesForUser(userId);
  }

  @Get(':id')
  @RequirePermission('resume', 'read')
  @ApiOperation({ summary: 'Get full resume details' })
  @ApiResponse({ status: 200, type: ResumeFullResponseDto })
  @ApiResponse({ status: 200, description: 'Resume retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async getResumeDetails(@Param('id') resumeId: string) {
    return this.resumeManagement.getResumeDetails(resumeId);
  }

  @Delete(':id')
  @RequirePermission('resume', 'delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a resume' })
  @ApiResponse({ status: 200, type: DeleteResponseDto })
  @ApiResponse({ status: 200, description: 'Resume deleted successfully' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async deleteResume(@Param('id') resumeId: string) {
    return this.resumeManagement.deleteResume(resumeId);
  }
}
