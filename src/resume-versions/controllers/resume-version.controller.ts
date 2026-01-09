import { Controller, Get, Post, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResumeVersionService } from '../services/resume-version.service';
import type { Request } from 'express';

interface RequestWithUser extends Request {
  user: { id: string; email: string };
}

@Controller('api/v1/resumes/:resumeId/versions')
@UseGuards(JwtAuthGuard)
export class ResumeVersionController {
  constructor(private readonly versionService: ResumeVersionService) {}

  @Get()
  async getVersions(
    @Param('resumeId') resumeId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.versionService.getVersions(resumeId, req.user.id);
  }

  @Post(':versionId/restore')
  async restoreVersion(
    @Param('resumeId') resumeId: string,
    @Param('versionId') versionId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.versionService.restoreVersion(resumeId, versionId, req.user.id);
  }
}
