import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { TailorResumeRequestDto } from '../dto/tailor-resume-request.dto';
import { toVersionIsoList } from '../presenters/resume-version.presenter';
import {
  ResumeTailorService,
  type TailoredVersionDiff,
  type TailorResumeResult,
} from '../services/resume-tailor/resume-tailor.service';

interface RequestWithUser extends Request {
  user: { userId: string; email: string };
}

@SdkExport({ tag: 'resumes', description: 'Resume AI tailoring API' })
@ApiTags('resume-tailor')
@ApiBearerAuth('JWT-auth')
@Controller('v1/resumes')
@UseGuards(JwtAuthGuard)
export class ResumeTailorController {
  constructor(private readonly tailor: ResumeTailorService) {}

  @Post(':resumeId/tailor')
  @ApiOperation({
    summary: 'Rewrite this resume for a specific job using the AI pipeline.',
  })
  @ApiParam({ name: 'resumeId', type: 'string' })
  @ApiBody({ type: TailorResumeRequestDto })
  async tailorForJob(
    @Param('resumeId') resumeId: string,
    @Body() body: TailorResumeRequestDto,
    @Req() req: RequestWithUser,
  ): Promise<DataResponse<TailorResumeResult>> {
    const data = await this.tailor.tailorForJob({
      resumeId,
      userId: req.user.userId,
      jobId: body?.jobId,
      jobDescription: body?.jobDescription,
      jobTitle: body?.jobTitle,
      jobCompany: body?.jobCompany,
    });
    return { success: true, data };
  }

  @Get(':resumeId/tailored-versions')
  @ApiOperation({ summary: 'List tailored resume variants produced by the AI.' })
  @ApiParam({ name: 'resumeId', type: 'string' })
  async listTailored(
    @Param('resumeId') resumeId: string,
    @Req() req: RequestWithUser,
  ): Promise<
    DataResponse<{
      versions: Array<{
        id: string;
        versionNumber: number;
        label: string | null;
        createdAt: string;
        tailoredJobId: string | null;
      }>;
    }>
  > {
    const versions = await this.tailor.getTailoredVersions(resumeId, req.user.userId);
    return {
      success: true,
      data: {
        versions: toVersionIsoList(versions),
      },
    };
  }

  @Get(':resumeId/diff')
  @ApiOperation({
    summary: 'Structured diff between the master resume and a tailored version.',
  })
  @ApiParam({ name: 'resumeId', type: 'string' })
  async getDiff(
    @Param('resumeId') resumeId: string,
    @Query('versionId') versionId: string,
    @Req() req: RequestWithUser,
  ): Promise<DataResponse<TailoredVersionDiff>> {
    const diff = await this.tailor.getDiff(resumeId, versionId, req.user.userId);
    return { success: true, data: diff };
  }
}
