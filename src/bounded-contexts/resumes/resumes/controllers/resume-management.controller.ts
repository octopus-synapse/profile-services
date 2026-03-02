/**
 * Resume Management Controller
 *
 * Endpoints for managing resumes with elevated permissions.
 * Protected by permission system - any role with required permissions can access.
 *
 * Single Responsibility: HTTP interface for resume management operations.
 */

import { Controller, Delete, Get, HttpCode, HttpStatus, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { PermissionGuard, RequirePermission } from '@/bounded-contexts/identity/authorization';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import {
  ResumeDetailsDataDto,
  ResumeListDataDto,
  ResumeOperationMessageDataDto,
} from '../dto/management-response.dto';
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
  @ApiDataResponse(ResumeListDataDto, {
    description: 'Resumes retrieved successfully',
  })
  async listResumesForUser(
    @Param('userId') userId: string,
  ): Promise<DataResponse<ResumeListDataDto>> {
    const resumes = await this.resumeManagement.listResumesForUser(userId);
    return { success: true, data: { resumes: resumes.resumes } };
  }

  @Get(':id')
  @RequirePermission('resume', 'read')
  @ApiOperation({ summary: 'Get full resume details' })
  @ApiDataResponse(ResumeDetailsDataDto, {
    description: 'Resume retrieved successfully',
  })
  async getResumeDetails(
    @Param('id') resumeId: string,
  ): Promise<DataResponse<ResumeDetailsDataDto>> {
    const resume = await this.resumeManagement.getResumeDetails(resumeId);
    return { success: true, data: { resume } };
  }

  @Delete(':id')
  @RequirePermission('resume', 'delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a resume' })
  @ApiDataResponse(ResumeOperationMessageDataDto, {
    description: 'Resume deleted successfully',
  })
  async deleteResume(
    @Param('id') resumeId: string,
  ): Promise<DataResponse<ResumeOperationMessageDataDto>> {
    await this.resumeManagement.deleteResume(resumeId);
    return { success: true, data: { message: 'Resume deleted successfully' } };
  }
}
