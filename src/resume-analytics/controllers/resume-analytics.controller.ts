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

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { ResumeAnalyticsService } from '../services/resume-analytics.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ApiResponseHelper,
  ApiResponse as AppApiResponse,
} from '../../common/dto';
import type {
  TrackView,
  ViewStatsQuery,
  KeywordOptions,
  JobMatch,
  BenchmarkOptions,
  HistoryQuery,
  ViewStatsResponse,
  ATSScoreResponse,
  KeywordSuggestionsResponse,
  JobMatchResponse,
  BenchmarkResponse,
  DashboardResponse,
  SnapshotResponse,
  ScoreProgressionResponse,
} from '@octopus-synapse/profile-contracts';

interface AuthUser {
  id: string;
  email: string;
}

@ApiTags('Resume Analytics')
@Controller('resume-analytics')
export class ResumeAnalyticsController {
  constructor(private readonly analyticsService: ResumeAnalyticsService) {}

  @Post(':resumeId/track-view')
  @ApiOperation({ summary: 'Track resume view (public endpoint)' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @SwaggerResponse({ status: 200, description: 'View tracked successfully' })
  async trackView(
    @Param('resumeId') resumeId: string,
    @Body() _dto: TrackView,
    @Req() req: Request,
  ): Promise<AppApiResponse> {
    await this.analyticsService.trackView({
      resumeId,
      ip: req.ip ?? '0.0.0.0',
      userAgent: req.headers['user-agent'],
      referer: req.headers['referer'],
    });

    return ApiResponseHelper.message('View tracked successfully');
  }

  @Get(':resumeId/views')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get view statistics' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @SwaggerResponse({ status: 200, description: 'View statistics retrieved' })
  async getViewStats(
    @Param('resumeId') resumeId: string,
    @Query() query: ViewStatsQuery,
    @CurrentUser() user: AuthUser,
  ): Promise<AppApiResponse<ViewStatsResponse>> {
    const stats = await this.analyticsService.getViewStats(
      resumeId,
      user.id,
      query,
    );

    return ApiResponseHelper.success(stats as ViewStatsResponse);
  }

  @Get(':resumeId/ats-score')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Calculate ATS compatibility score' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @SwaggerResponse({ status: 200, description: 'ATS score calculated' })
  async getATSScore(
    @Param('resumeId') resumeId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<AppApiResponse<ATSScoreResponse>> {
    const score = await this.analyticsService.calculateATSScore(
      resumeId,
      user.id,
    );

    return ApiResponseHelper.success(score as ATSScoreResponse);
  }

  @Get(':resumeId/keywords')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get keyword optimization suggestions' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @SwaggerResponse({
    status: 200,
    description: 'Keyword suggestions retrieved',
  })
  async getKeywordSuggestions(
    @Param('resumeId') resumeId: string,
    @Query() options: KeywordOptions,
    @CurrentUser() user: AuthUser,
  ): Promise<AppApiResponse<KeywordSuggestionsResponse>> {
    const suggestions = await this.analyticsService.getKeywordSuggestions(
      resumeId,
      user.id,
      options,
    );

    return ApiResponseHelper.success(suggestions as KeywordSuggestionsResponse);
  }

  @Post(':resumeId/match-job')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Match resume against job description' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @SwaggerResponse({ status: 200, description: 'Job match calculated' })
  async matchJob(
    @Param('resumeId') resumeId: string,
    @Body() dto: JobMatch,
    @CurrentUser() user: AuthUser,
  ): Promise<AppApiResponse<JobMatchResponse>> {
    const match = await this.analyticsService.matchJobDescription(
      resumeId,
      user.id,
      dto.jobDescription,
    );

    return ApiResponseHelper.success(match as JobMatchResponse);
  }

  @Get(':resumeId/benchmark')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get industry benchmark comparison' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @SwaggerResponse({ status: 200, description: 'Benchmark data retrieved' })
  async getBenchmark(
    @Param('resumeId') resumeId: string,
    @Query() options: BenchmarkOptions,
    @CurrentUser() user: AuthUser,
  ): Promise<AppApiResponse<BenchmarkResponse>> {
    const benchmark = await this.analyticsService.getIndustryBenchmark(
      resumeId,
      user.id,
      options,
    );

    return ApiResponseHelper.success(benchmark as BenchmarkResponse);
  }

  @Get(':resumeId/dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get complete analytics dashboard' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @SwaggerResponse({ status: 200, description: 'Dashboard data retrieved' })
  async getDashboard(
    @Param('resumeId') resumeId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<AppApiResponse<DashboardResponse>> {
    const dashboard = await this.analyticsService.getDashboard(
      resumeId,
      user.id,
    );

    return ApiResponseHelper.success(dashboard as DashboardResponse);
  }

  @Post(':resumeId/snapshot')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save analytics snapshot for tracking progress' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @SwaggerResponse({ status: 201, description: 'Snapshot created' })
  async createSnapshot(
    @Param('resumeId') resumeId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<AppApiResponse<SnapshotResponse>> {
    const snapshot = await this.analyticsService.saveSnapshot(
      resumeId,
      user.id,
    );

    return ApiResponseHelper.success(snapshot as SnapshotResponse);
  }

  @Get(':resumeId/history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get analytics history' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @SwaggerResponse({ status: 200, description: 'History retrieved' })
  async getHistory(
    @Param('resumeId') resumeId: string,
    @Query() query: HistoryQuery,
    @CurrentUser() user: AuthUser,
  ): Promise<AppApiResponse<SnapshotResponse[]>> {
    const history = await this.analyticsService.getHistory(
      resumeId,
      user.id,
      query,
    );

    return ApiResponseHelper.success(history as SnapshotResponse[]);
  }

  @Get(':resumeId/progression')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get score progression over time' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @SwaggerResponse({ status: 200, description: 'Score progression retrieved' })
  async getProgression(
    @Param('resumeId') resumeId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<AppApiResponse<ScoreProgressionResponse>> {
    const progression = await this.analyticsService.getScoreProgression(
      resumeId,
      user.id,
    );

    return ApiResponseHelper.success(progression as ScoreProgressionResponse);
  }
}
