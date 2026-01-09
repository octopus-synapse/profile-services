import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResumeVersionService } from '../services/resume-version.service';
import type { Request } from 'express';

interface RequestWithUser extends Request {
  user: { userId: string; email: string };
}

@Controller('v1')
@UseGuards(JwtAuthGuard)
export class ResumeVersionController {
  constructor(private readonly versionService: ResumeVersionService) {}

  // Original endpoints
  @Get('resumes/:resumeId/versions')
  async getVersionsNested(
    @Param('resumeId') resumeId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.versionService.getVersions(resumeId, req.user.userId);
  }

  @Post('resumes/:resumeId/versions/:versionId/restore')
  async restoreVersionNested(
    @Param('resumeId') resumeId: string,
    @Param('versionId') versionId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.versionService.restoreVersion(
      resumeId,
      versionId,
      req.user.userId,
    );
  }

  // Alternative flat endpoints for easier testing
  @Get('versions/:resumeId')
  async getVersions(
    @Param('resumeId') resumeId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.versionService.getVersions(resumeId, req.user.userId);
  }

  @Get('versions/:resumeId/:versionId')
  async getVersion(
    @Param('resumeId') resumeId: string,
    @Param('versionId') versionId: string,
    @Req() req: RequestWithUser,
  ) {
    const versions = await this.versionService.getVersions(
      resumeId,
      req.user.userId,
    );
    const version = versions.find((v) => v.id === versionId);

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    return version;
  }

  @Post('versions/:resumeId/restore/:versionId')
  async restoreVersion(
    @Param('resumeId') resumeId: string,
    @Param('versionId') versionId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.versionService.restoreVersion(
      resumeId,
      versionId,
      req.user.userId,
    );
  }
}
