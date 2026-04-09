/**
 * Resume Analytics Controller
 *
 * REST API endpoints for resume analytics and insights.
 *
 * Features:
 * - View tracking (public endpoint)
 * - ATS score calculation
 * - Keyword optimization
 * - Job description matching
 * - Industry benchmarking
 * - Dashboard aggregation
 * - Historical snapshots
 */

import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure/decorators/public.decorator';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { type DataResponse } from '@/bounded-contexts/platform/common/dto';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import {
  ATSScoreResponseDto,
  BenchmarkOptionsDto,
  BenchmarkResponseDto,
  CreateSnapshotRequestDto,
  DashboardResponseDto,
  HistoryQueryDto,
  JobMatchRequestDto,
  JobMatchResponseDto,
  KeywordOptionsDto,
  KeywordSuggestionsResponseDto,
  MessageResponseDto,
  ScoreProgressionResponseDto,
  SnapshotResponseDto,
  TrackViewRequestDto,
  ViewStatsQueryDto,
  ViewStatsResponseDto,
} from '../dto/analytics.dto';
import { ResumeAnalyticsFacade } from '../services/resume-analytics.facade';

interface AuthUser {
  id: string;
  email: string;
}

@SdkExport({ tag: 'resume-analytics', description: 'Resume Analytics API' })
@ApiTags('Resume Analytics')
@Controller('resume-analytics')
export class ResumeAnalyticsController {
  constructor(private readonly analyticsService: ResumeAnalyticsFacade) {}

  @Public()
  @Post(':resumeId/track-view')
  @ApiOperation({ summary: 'Track resume view (public endpoint)' })
  @ApiDataResponse(MessageResponseDto, {
    status: 201,
    description: 'View tracked successfully',
  })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  async trackView(
    @Param('resumeId') resumeId: string,
    @Body() _dto: TrackViewRequestDto,
    @Req() req: Request,
  ): Promise<DataResponse<MessageResponseDto>> {
    await this.analyticsService.trackView({
      resumeId,
      ip: req.ip ?? '0.0.0.0',
      userAgent: req.headers['user-agent'],
      referer: req.headers.referer,
    });

    return { success: true, data: { message: 'View tracked successfully' } };
  }

  @Get(':resumeId/views')
  @RequirePermission(Permission.ANALYTICS_READ_OWN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get view statistics' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiDataResponse(Object, { description: 'View statistics retrieved' })
  async getViewStats(
    @Param('resumeId') resumeId: string,
    @Query() query: ViewStatsQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<DataResponse<ViewStatsResponseDto>> {
    const stats = await this.analyticsService.getViewStats(resumeId, user.id, {
      period: query.period,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });

    return { success: true, data: stats as ViewStatsResponseDto };
  }

  @Get(':resumeId/ats-score')
  @RequirePermission(Permission.ANALYTICS_READ_OWN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Calculate ATS compatibility score' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiDataResponse(Object, { description: 'ATS score calculated' })
  async getATSScore(
    @Param('resumeId') resumeId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<DataResponse<ATSScoreResponseDto>> {
    const score = await this.analyticsService.calculateATSScore(resumeId, user.id);

    return { success: true, data: score as ATSScoreResponseDto };
  }

  @Get(':resumeId/keywords')
  @RequirePermission(Permission.ANALYTICS_READ_OWN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get keyword optimization suggestions' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiDataResponse(Object, {
    description: 'Keyword suggestions retrieved',
  })
  async getKeywordSuggestions(
    @Param('resumeId') resumeId: string,
    @Query() options: KeywordOptionsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<DataResponse<KeywordSuggestionsResponseDto>> {
    const suggestions = await this.analyticsService.getKeywordSuggestions(
      resumeId,
      user.id,
      options,
    );

    return {
      success: true,
      data: suggestions as KeywordSuggestionsResponseDto,
    };
  }

  @Post(':resumeId/match-job')
  @RequirePermission(Permission.ANALYTICS_READ_OWN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Match resume against job description' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiDataResponse(Object, { description: 'Job match calculated' })
  async matchJob(
    @Param('resumeId') resumeId: string,
    @Body() dto: JobMatchRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<DataResponse<JobMatchResponseDto>> {
    const match = await this.analyticsService.matchJobDescription(
      resumeId,
      user.id,
      dto.jobDescription,
    );

    return { success: true, data: match as JobMatchResponseDto };
  }

  @Get(':resumeId/benchmark')
  @RequirePermission(Permission.ANALYTICS_READ_OWN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get industry benchmark comparison' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiDataResponse(Object, { description: 'Benchmark data retrieved' })
  async getBenchmark(
    @Param('resumeId') resumeId: string,
    @Query() options: BenchmarkOptionsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<DataResponse<BenchmarkResponseDto>> {
    const benchmark = await this.analyticsService.getIndustryBenchmark(resumeId, user.id, options);

    return { success: true, data: benchmark as BenchmarkResponseDto };
  }

  @Get(':resumeId/dashboard')
  @RequirePermission(Permission.ANALYTICS_READ_OWN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get complete analytics dashboard' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiDataResponse(Object, { description: 'Dashboard data retrieved' })
  async getDashboard(
    @Param('resumeId') resumeId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<DataResponse<DashboardResponseDto>> {
    const dashboard = await this.analyticsService.getDashboard(resumeId, user.id);

    return { success: true, data: dashboard as DashboardResponseDto };
  }

  @Post(':resumeId/snapshot')
  @RequirePermission(Permission.ANALYTICS_READ_OWN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save analytics snapshot for tracking progress' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiBody({ type: CreateSnapshotRequestDto })
  @ApiDataResponse(Object, { status: 201, description: 'Snapshot created' })
  async createSnapshot(
    @Param('resumeId') resumeId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<DataResponse<SnapshotResponseDto>> {
    const snapshot = await this.analyticsService.saveSnapshot(resumeId, user.id);

    return { success: true, data: snapshot as SnapshotResponseDto };
  }

  @Get(':resumeId/history')
  @RequirePermission(Permission.ANALYTICS_READ_OWN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get analytics history' })
  @ApiDataResponse(Object, { description: 'History retrieved' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  async getHistory(
    @Param('resumeId') resumeId: string,
    @Query() query: HistoryQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<DataResponse<SnapshotResponseDto[]>> {
    const history = await this.analyticsService.getHistory(resumeId, user.id, query);

    return { success: true, data: history as SnapshotResponseDto[] };
  }

  @Get(':resumeId/progression')
  @RequirePermission(Permission.ANALYTICS_READ_OWN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get score progression over time' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiDataResponse(Object, { description: 'Score progression retrieved' })
  async getProgression(
    @Param('resumeId') resumeId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<DataResponse<ScoreProgressionResponseDto>> {
    const progression = await this.analyticsService.getScoreProgression(resumeId, user.id);

    return { success: true, data: progression as ScoreProgressionResponseDto };
  }
}
