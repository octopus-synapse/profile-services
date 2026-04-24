import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { RequireFitProfileGuard } from '@/bounded-contexts/fit-profile/infrastructure/guards/require-fit-profile.guard';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import {
  RequireMinQuality,
  RequireMinQualityGuard,
} from '@/bounded-contexts/resume-quality/infrastructure/guards/require-min-quality.guard';
import { TailorResumeRequestDto } from '../dto/tailor-resume-request.dto';
import {
  TailoredVersionDiffDataDto,
  TailoredVersionsListDataDto,
  TailorResumeDataDto,
} from '../dto/tailor-resume-response.dto';
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
  @UseGuards(RequireFitProfileGuard, RequireMinQualityGuard)
  @RequireMinQuality(50, 'resumeId')
  @ApiOperation({
    summary: 'Rewrite this resume for a specific job using the AI pipeline.',
  })
  @ApiParam({ name: 'resumeId', type: 'string' })
  @ApiBody({ type: TailorResumeRequestDto })
  @ApiDataResponse(TailorResumeDataDto, {
    description: 'New tailored version metadata + bullet-level diff.',
  })
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
  @ApiDataResponse(TailoredVersionsListDataDto, {
    description: 'All tailored variants the user has generated so far.',
  })
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
  @ApiDataResponse(TailoredVersionDiffDataDto, {
    description: 'Summary / jobTitle / bullets before → after shape.',
  })
  async getDiff(
    @Param('resumeId') resumeId: string,
    @Query('versionId') versionId: string,
    @Req() req: RequestWithUser,
  ): Promise<DataResponse<TailoredVersionDiff>> {
    const diff = await this.tailor.getDiff(resumeId, versionId, req.user.userId);
    return { success: true, data: diff };
  }
}
