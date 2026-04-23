import {
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { RequirePermission } from '@/shared-kernel/authorization';
import {
  ComputeMatchUseCase,
  FitProfileRequiredForMatchError,
  JobNotFoundForMatchError,
  ResumeNotFoundForMatchError,
} from '../../application/use-cases/compute-match.use-case';
import { ComputeMatchRequestDto, MatchBreakdownDto } from '../../dto/match-breakdown.dto';
import { presentMatchBreakdown } from '../presenters/match-breakdown.presenter';

/**
 * HTTP surface for the Match Score. `POST /v1/match` computes the
 * breakdown on the fly (cache-aware); `GET /v1/match/:resumeId/:jobId`
 * is the idempotent read variant a recruiter UI hits repeatedly while
 * paging through candidates. The Fit gate is enforced in the use-case
 * and translated here into a `409 fit_profile_required` so the
 * frontend can redirect the user into the questionnaire.
 */
@SdkExport({ tag: 'job-match', description: 'Match Score API', requiresAuth: true })
@ApiTags('job-match')
@ApiBearerAuth('JWT-auth')
@Controller('v1/match')
@UseGuards(JwtAuthGuard)
export class JobMatchController {
  constructor(private readonly compute: ComputeMatchUseCase) {}

  @Post()
  @RequirePermission('resume', 'read')
  @ApiOperation({ summary: 'Compute the Match Score for a (resume, job) pair' })
  @ApiDataResponse(MatchBreakdownDto, { description: 'Full breakdown with sub-scores' })
  async computeNow(
    @Body() body: ComputeMatchRequestDto,
    @Req() req: Request,
  ): Promise<DataResponse<MatchBreakdownDto>> {
    return this.run(pickUserId(req), body.resumeId, body.jobId);
  }

  @Get(':resumeId/:jobId')
  @RequirePermission('resume', 'read')
  @ApiOperation({ summary: 'Read the Match Score for a (resume, job) pair (cached)' })
  @ApiDataResponse(MatchBreakdownDto, { description: 'Full breakdown with sub-scores' })
  async read(
    @Param('resumeId') resumeId: string,
    @Param('jobId') jobId: string,
    @Req() req: Request,
  ): Promise<DataResponse<MatchBreakdownDto>> {
    return this.run(pickUserId(req), resumeId, jobId);
  }

  private async run(
    userId: string,
    resumeId: string,
    jobId: string,
  ): Promise<DataResponse<MatchBreakdownDto>> {
    try {
      const breakdown = await this.compute.execute({ userId, resumeId, jobId });
      return { success: true, data: presentMatchBreakdown(breakdown) };
    } catch (err) {
      if (err instanceof ResumeNotFoundForMatchError)
        throw new NotFoundException('resume_not_found');
      if (err instanceof JobNotFoundForMatchError) throw new NotFoundException('job_not_found');
      if (err instanceof FitProfileRequiredForMatchError) {
        throw new ConflictException({
          code: 'fit_profile_required',
          message: 'Complete the Fit questionnaire to unlock the Match Score.',
          nextAction: '/v1/fit-profile/questions',
        });
      }
      throw err;
    }
  }
}

function pickUserId(req: Request): string {
  const user = (req as Request & { user?: { id?: string; userId?: string } }).user;
  const id = user?.id ?? user?.userId;
  if (!id) throw new UnauthorizedException('authenticated_user_missing');
  return id;
}
