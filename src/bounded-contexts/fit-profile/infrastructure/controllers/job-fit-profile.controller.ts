import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { RequirePermission } from '@/shared-kernel/authorization';
import { GetJobFitProfileUseCase } from '../../application/use-cases/get-job-fit-profile.use-case';
import { UpsertJobFitProfileUseCase } from '../../application/use-cases/upsert-job-fit-profile.use-case';
import { JobFitProfileNotSetException } from '../../domain/exceptions/fit-profile.exceptions';
import {
  JobFitProfileResponseDto,
  UpsertJobFitProfileRequestDto,
} from '../../dto/job-fit-profile.dto';
import { presentJobFitProfile } from '../presenters/job-fit-profile.presenter';

/**
 * Recruiter-facing JobFitProfile sliders. The permission guard only
 * enforces `job:manage` here; multi-tenant scope checks (recruiter
 * owns the job) are out of scope for this task per the plan — they
 * land when the full recruiting RBAC matures.
 */
@SdkExport({ tag: 'fit-profile', description: 'Job Fit Profile (recruiter sliders)' })
@ApiTags('fit-profile')
@ApiBearerAuth('JWT-auth')
@Controller('v1/jobs/:jobId/fit-profile')
@UseGuards(JwtAuthGuard)
export class JobFitProfileController {
  constructor(
    private readonly upsert: UpsertJobFitProfileUseCase,
    private readonly getProfile: GetJobFitProfileUseCase,
  ) {}

  @Get()
  @RequirePermission('job', 'manage')
  @ApiOperation({ summary: 'Get the recruiter-authored Fit Profile for a job' })
  @ApiParam({ name: 'jobId', type: 'string' })
  @ApiDataResponse(JobFitProfileResponseDto, { description: 'Current JobFitProfile' })
  async getOne(@Param('jobId') jobId: string): Promise<DataResponse<JobFitProfileResponseDto>> {
    const profile = await this.getProfile.execute(jobId);
    if (!profile) throw new JobFitProfileNotSetException(jobId);
    return { success: true, data: presentJobFitProfile(profile) };
  }

  @Post()
  @RequirePermission('job', 'manage')
  @ApiOperation({ summary: 'Upsert the recruiter-authored Fit Profile for a job' })
  @ApiParam({ name: 'jobId', type: 'string' })
  @ApiDataResponse(JobFitProfileResponseDto, { description: 'Upserted JobFitProfile' })
  async upsertOne(
    @CurrentUser() user: UserPayload,
    @Param('jobId') jobId: string,
    @Body() body: UpsertJobFitProfileRequestDto,
  ): Promise<DataResponse<JobFitProfileResponseDto>> {
    const saved = await this.upsert.execute({
      jobId,
      editedByUserId: user.userId,
      sliders: body.sliders,
    });
    return { success: true, data: presentJobFitProfile(saved) };
  }
}
