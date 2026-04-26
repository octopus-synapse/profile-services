import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { RequirePermission } from '@/shared-kernel/authorization';
import { ComputeMatchUseCase } from '../../application/use-cases/compute-match.use-case';
import { JobMatchAuthenticatedUserMissingException } from '../../domain/exceptions/job-match.exceptions';
import { ComputeMatchRequestDto, MatchBreakdownDto } from '../../dto/match-breakdown.dto';
import { presentMatchBreakdown } from '../presenters/match-breakdown.presenter';

/**
 * HTTP surface for the Match Score. `POST /v1/match` computes the
 * breakdown on the fly (cache-aware); `GET /v1/match/:resumeId/:jobId`
 * is the idempotent read variant a recruiter UI hits repeatedly while
 * paging through candidates. The use case throws domain exceptions
 * (resume/job not found, fit profile required) — `DomainExceptionFilter`
 * maps them to HTTP without per-handler translation.
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
    const breakdown = await this.compute.execute({
      userId: pickUserId(req),
      resumeId: body.resumeId,
      jobId: body.jobId,
    });
    return { success: true, data: presentMatchBreakdown(breakdown) };
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
    const breakdown = await this.compute.execute({ userId: pickUserId(req), resumeId, jobId });
    return { success: true, data: presentMatchBreakdown(breakdown) };
  }
}

function pickUserId(req: Request): string {
  const user = (req as Request & { user?: { id?: string; userId?: string } }).user;
  const id = user?.id ?? user?.userId;
  if (!id) throw new JobMatchAuthenticatedUserMissingException();
  return id;
}
