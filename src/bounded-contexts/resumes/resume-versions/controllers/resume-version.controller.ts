import { Controller, Get, NotFoundException, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { ResumeVersionServicePort } from '@/bounded-contexts/resumes/core/ports/resume-version-service.port';
import {
  ResumeVersionDataDto,
  ResumeVersionListDataDto,
  ResumeVersionRestoreDataDto,
} from '../dto/controller-response.dto';
import { toVersionIsoList } from '../presenters/resume-version.presenter';

interface RequestWithUser extends Request {
  user: { userId: string; email: string };
}

@ApiTags('resume-versions')
@Controller('v1')
@UseGuards(JwtAuthGuard)
export class ResumeVersionController {
  constructor(private readonly versionService: ResumeVersionServicePort) {}

  // Original endpoints
  @Get('resumes/:resumeId/versions')
  @ApiOperation({ summary: 'List resume versions (nested route)' })
  @ApiParam({ name: 'resumeId', type: 'string' })
  @ApiDataResponse(ResumeVersionListDataDto, {
    description: 'Resume versions returned',
  })
  async getVersionsNested(
    @Param('resumeId') resumeId: string,
    @Req() req: RequestWithUser,
  ): Promise<DataResponse<ResumeVersionListDataDto>> {
    const versions = await this.versionService.getVersions(resumeId, req.user.userId);

    return {
      success: true,
      data: {
        versions: toVersionIsoList(versions),
      },
    };
  }

  @Post('resumes/:resumeId/versions/:versionId/restore')
  @ApiOperation({ summary: 'Restore resume version (nested route)' })
  @ApiParam({ name: 'resumeId', type: 'string' })
  @ApiParam({ name: 'versionId', type: 'string' })
  @ApiDataResponse(ResumeVersionRestoreDataDto, {
    description: 'Resume version restored',
  })
  async restoreVersionNested(
    @Param('resumeId') resumeId: string,
    @Param('versionId') versionId: string,
    @Req() req: RequestWithUser,
  ): Promise<DataResponse<ResumeVersionRestoreDataDto>> {
    const restored = await this.versionService.restoreVersion(resumeId, versionId, req.user.userId);

    return {
      success: true,
      data: {
        success: true,
        restoredFrom: restored.restoredFrom.toISOString(),
      },
    };
  }

  // Alternative flat endpoints for easier testing
  @Get('versions/:resumeId')
  @ApiOperation({ summary: 'List resume versions' })
  @ApiParam({ name: 'resumeId', type: 'string' })
  @ApiDataResponse(ResumeVersionListDataDto, {
    description: 'Resume versions returned',
  })
  async getVersions(
    @Param('resumeId') resumeId: string,
    @Req() req: RequestWithUser,
  ): Promise<DataResponse<ResumeVersionListDataDto>> {
    const versions = await this.versionService.getVersions(resumeId, req.user.userId);

    return {
      success: true,
      data: {
        versions: toVersionIsoList(versions),
      },
    };
  }

  @Get('versions/:resumeId/:versionId')
  @ApiOperation({ summary: 'Get a specific resume version' })
  @ApiParam({ name: 'resumeId', type: 'string' })
  @ApiParam({ name: 'versionId', type: 'string' })
  @ApiDataResponse(ResumeVersionDataDto, {
    description: 'Resume version returned',
  })
  async getVersion(
    @Param('resumeId') resumeId: string,
    @Param('versionId') versionId: string,
    @Req() req: RequestWithUser,
  ): Promise<DataResponse<ResumeVersionDataDto>> {
    const versions = await this.versionService.getVersions(resumeId, req.user.userId);
    const version = versions.find((v) => v.id === versionId);

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    return {
      success: true,
      data: {
        version: { ...version, createdAt: version.createdAt.toISOString() },
      },
    };
  }

  @Post('versions/:resumeId/restore/:versionId')
  @ApiOperation({ summary: 'Restore resume version' })
  @ApiParam({ name: 'resumeId', type: 'string' })
  @ApiParam({ name: 'versionId', type: 'string' })
  @ApiDataResponse(ResumeVersionRestoreDataDto, {
    description: 'Resume version restored',
  })
  async restoreVersion(
    @Param('resumeId') resumeId: string,
    @Param('versionId') versionId: string,
    @Req() req: RequestWithUser,
  ): Promise<DataResponse<ResumeVersionRestoreDataDto>> {
    const restored = await this.versionService.restoreVersion(resumeId, versionId, req.user.userId);

    return {
      success: true,
      data: {
        success: true,
        restoredFrom: restored.restoredFrom.toISOString(),
      },
    };
  }
}
