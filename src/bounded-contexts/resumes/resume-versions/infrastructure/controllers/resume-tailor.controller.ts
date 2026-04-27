import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
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
import {
  ResumeTailorService,
  type TailorResumeResult,
} from '../../application/services/resume-tailor.service';
import { TailorResumeRequestDto } from '../dto/tailor-resume-request.dto';
import { TailorResumeDataDto } from '../dto/tailor-resume-response.dto';

interface RequestWithUser extends Request {
  user: { userId: string; email: string };
}

/**
 * Legacy Nest controller carrying just the `POST :resumeId/tailor`
 * endpoint — its `RequireFitProfileGuard` + `RequireMinQualityGuard`
 * chain is not yet expressible via Route descriptors. The two read-only
 * tailor endpoints live in `resume-versions.routes.ts`.
 */
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
  @ApiOperation({ summary: 'Rewrite this resume for a specific job using the AI pipeline.' })
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
}
