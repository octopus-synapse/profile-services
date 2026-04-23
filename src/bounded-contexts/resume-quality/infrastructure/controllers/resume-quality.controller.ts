import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { RequirePermission } from '@/shared-kernel/authorization';
import { ComputeQualityUseCase } from '../../application/use-cases/compute-quality.use-case';
import { GetLatestQualityUseCase } from '../../application/use-cases/get-latest-quality.use-case';
import { ResumeQualityResponseDto } from '../../dto/resume-quality-response.dto';
import { presentQualitySnapshot } from '../presenters/resume-quality.presenter';

/**
 * HTTP surface for Resume Quality. `GET` returns the latest persisted
 * snapshot (fast, no AI calls); `POST recompute` synchronously re-runs
 * the whole pipeline, appends a fresh history row and returns it. A
 * BullMQ-backed recompute-on-ResumeUpdated worker lands in Task #20;
 * this POST is the user-facing equivalent for "refresh now" buttons.
 */
@SdkExport({ tag: 'resume-quality', description: 'Resume Quality Score', requiresAuth: true })
@ApiTags('resume-quality')
@ApiBearerAuth('JWT-auth')
@Controller('v1/resumes/:resumeId/quality')
@UseGuards(JwtAuthGuard)
export class ResumeQualityController {
  constructor(
    private readonly getLatest: GetLatestQualityUseCase,
    private readonly compute: ComputeQualityUseCase,
  ) {}

  @Get()
  @RequirePermission('resume', 'read')
  @ApiOperation({ summary: 'Get the latest Resume Quality Score snapshot' })
  @ApiParam({ name: 'resumeId', type: 'string' })
  @ApiDataResponse(ResumeQualityResponseDto, { description: 'Latest snapshot or 404' })
  async get(@Param('resumeId') resumeId: string): Promise<DataResponse<ResumeQualityResponseDto>> {
    const snapshot = await this.getLatest.execute(resumeId);
    if (!snapshot) throw new NotFoundException('No quality snapshot yet — POST /recompute first');
    return { success: true, data: presentQualitySnapshot(snapshot) };
  }

  @Post('recompute')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('resume', 'update')
  @ApiOperation({ summary: 'Synchronously recompute Resume Quality Score' })
  @ApiParam({ name: 'resumeId', type: 'string' })
  @ApiDataResponse(ResumeQualityResponseDto, { description: 'Freshly computed snapshot' })
  async recompute(
    @Param('resumeId') resumeId: string,
  ): Promise<DataResponse<ResumeQualityResponseDto>> {
    const snapshot = await this.compute.execute(resumeId);
    return { success: true, data: presentQualitySnapshot(snapshot) };
  }
}
