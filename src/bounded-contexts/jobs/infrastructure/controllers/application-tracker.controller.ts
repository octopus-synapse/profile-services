import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import {
  type CompanyResponseStats,
  GetCompanyResponseStatsUseCase,
} from '../../application/use-cases/get-company-response-stats/get-company-response-stats.use-case';
import {
  ListApplicationTimelineUseCase,
  type TrackedApplication,
} from '../../application/use-cases/list-application-timeline/list-application-timeline.use-case';
import { RecordApplicationEventUseCase } from '../../application/use-cases/record-application-event/record-application-event.use-case';
import { RecordApplicationEventDto } from '../../dto/application-event.dto';

interface RequestWithUser extends Request {
  user: { userId: string; email: string };
}

@SdkExport({
  tag: 'application-tracker',
  description: 'Timeline + silence detection for job applications',
})
@ApiTags('application-tracker')
@ApiBearerAuth()
@Controller('v1/jobs/applications')
export class ApplicationTrackerController {
  constructor(
    private readonly listTimeline: ListApplicationTimelineUseCase,
    private readonly recordEventUseCase: RecordApplicationEventUseCase,
    private readonly companyStats: GetCompanyResponseStatsUseCase,
  ) {}

  @Get('tracker')
  @RequirePermission(Permission.FEED_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Full application timeline for the viewer (enviada → visualizada → entrevista → oferta/silêncio).',
  })
  @ApiQuery({
    name: 'silentDays',
    required: false,
    type: Number,
    description: 'Silence threshold in days. Defaults to 10.',
  })
  async getTimeline(
    @Req() req: RequestWithUser,
    @Query('silentDays') silentDays?: number,
  ): Promise<DataResponse<{ applications: TrackedApplication[] }>> {
    const threshold = silentDays ? Math.max(1, Number(silentDays)) : 10;
    const applications = await this.listTimeline.execute(req.user.userId, threshold);
    return { success: true, data: { applications } };
  }

  @Post(':applicationId/events')
  @RequirePermission(Permission.FEED_USE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Record a timeline event on an application (viewed, interview scheduled, offer, etc.).',
  })
  @ApiParam({ name: 'applicationId', type: 'string' })
  @ApiBody({ type: RecordApplicationEventDto })
  async recordEvent(
    @Param('applicationId') applicationId: string,
    @Body() body: RecordApplicationEventDto,
    @Req() req: RequestWithUser,
  ): Promise<DataResponse<{ id: string; type: string; note: string | null; occurredAt: string }>> {
    const event = await this.recordEventUseCase.execute({
      applicationId,
      userId: req.user.userId,
      type: body.type,
      occurredAt: body.occurredAt ? new Date(body.occurredAt) : undefined,
      note: body.note,
    });
    return { success: true, data: event };
  }

  @Get('companies/:company/response-stats')
  @RequirePermission(Permission.FEED_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Per-company response percentiles (p50/p90 days to first response).' })
  @ApiParam({ name: 'company', type: 'string' })
  async companyResponseStats(
    @Param('company') company: string,
  ): Promise<DataResponse<CompanyResponseStats>> {
    const data = await this.companyStats.execute(company);
    return { success: true, data };
  }
}
