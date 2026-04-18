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
import { RecordApplicationEventDto } from '../dto/application-event.dto';
import {
  ApplicationTrackerService,
  type CompanyResponseStats,
  type TrackedApplication,
} from './application-tracker.service';

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
  constructor(private readonly tracker: ApplicationTrackerService) {}

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
    const applications = await this.tracker.listTimeline(req.user.userId, threshold);
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
    const event = await this.tracker.recordEvent(
      applicationId,
      req.user.userId,
      body.type,
      body.occurredAt ? new Date(body.occurredAt) : undefined,
      body.note,
    );
    return { success: true, data: event };
  }

  @Get('companies/:company/response-stats')
  @RequirePermission(Permission.FEED_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Per-company response percentiles (p50/p90 days to first response).',
  })
  @ApiParam({ name: 'company', type: 'string' })
  async companyResponseStats(
    @Param('company') company: string,
  ): Promise<DataResponse<CompanyResponseStats>> {
    const data = await this.tracker.companyResponseStats(company);
    return { success: true, data };
  }
}
