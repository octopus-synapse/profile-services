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
import {
  TrackViewDto,
  ViewStatsQueryDto,
  KeywordOptionsDto,
  JobMatchDto,
  BenchmarkOptionsDto,
  HistoryQueryDto,
  ViewStatsResponseDto,
  ATSScoreResponseDto,
  KeywordSuggestionsResponseDto,
  JobMatchResponseDto,
  BenchmarkResponseDto,
  DashboardResponseDto,
  SnapshotResponseDto,
  ScoreProgressionResponseDto,
} from '../dto';

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
    @Body() _dto: TrackViewDto,
    @Req() req: Request,
  ): Promise<AppApiResponse> {
    await this.analyticsService.trackView({
      resumeId,
      ip: req.ip || '0.0.0.0',
      userAgent: req.headers['user-agent'],
      referer: req.headers['referer'] as string | undefined,
    });

    return ApiResponseHelper.message('View tracked successfully');
  }

  @Get(':resumeId/views')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get view statistics' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @SwaggerResponse({ status: 200, type: ViewStatsResponseDto })
  async getViewStats(
    @Param('resumeId') resumeId: string,
    @Query() query: ViewStatsQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AppApiResponse<ViewStatsResponseDto>> {
    const stats = await this.analyticsService.getViewStats(
      resumeId,
      user.id,
      query,
    );

    return ApiResponseHelper.success(stats as ViewStatsResponseDto);
  }

  @Get(':resumeId/ats-score')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Calculate ATS compatibility score' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @SwaggerResponse({ status: 200, type: ATSScoreResponseDto })
  async getATSScore(
    @Param('resumeId') resumeId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<AppApiResponse<ATSScoreResponseDto>> {
    const score = await this.analyticsService.calculateATSScore(
      resumeId,
      user.id,
    );

    return ApiResponseHelper.success(score as ATSScoreResponseDto);
  }

  @Get(':resumeId/keywords')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get keyword optimization suggestions' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @SwaggerResponse({ status: 200, type: KeywordSuggestionsResponseDto })
  async getKeywordSuggestions(
    @Param('resumeId') resumeId: string,
    @Query() options: KeywordOptionsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AppApiResponse<KeywordSuggestionsResponseDto>> {
    const suggestions = await this.analyticsService.getKeywordSuggestions(
      resumeId,
      user.id,
      options,
    );

    return ApiResponseHelper.success(
      suggestions as KeywordSuggestionsResponseDto,
    );
  }

  @Post(':resumeId/match-job')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Match resume against job description' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @SwaggerResponse({ status: 200, type: JobMatchResponseDto })
  async matchJob(
    @Param('resumeId') resumeId: string,
    @Body() dto: JobMatchDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AppApiResponse<JobMatchResponseDto>> {
    const match = await this.analyticsService.matchJobDescription(
      resumeId,
      user.id,
      dto.jobDescription,
    );

    return ApiResponseHelper.success(match as JobMatchResponseDto);
  }

  @Get(':resumeId/benchmark')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get industry benchmark comparison' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @SwaggerResponse({ status: 200, type: BenchmarkResponseDto })
  async getBenchmark(
    @Param('resumeId') resumeId: string,
    @Query() options: BenchmarkOptionsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AppApiResponse<BenchmarkResponseDto>> {
    const benchmark = await this.analyticsService.getIndustryBenchmark(
      resumeId,
      user.id,
      options,
    );

    return ApiResponseHelper.success(benchmark as BenchmarkResponseDto);
  }

  @Get(':resumeId/dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get complete analytics dashboard' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @SwaggerResponse({ status: 200, type: DashboardResponseDto })
  async getDashboard(
    @Param('resumeId') resumeId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<AppApiResponse<DashboardResponseDto>> {
    const dashboard = await this.analyticsService.getDashboard(
      resumeId,
      user.id,
    );

    return ApiResponseHelper.success(dashboard as DashboardResponseDto);
  }

  @Post(':resumeId/snapshot')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save analytics snapshot for tracking progress' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @SwaggerResponse({ status: 201, type: SnapshotResponseDto })
  async createSnapshot(
    @Param('resumeId') resumeId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<AppApiResponse<SnapshotResponseDto>> {
    const snapshot = await this.analyticsService.saveSnapshot(
      resumeId,
      user.id,
    );

    return ApiResponseHelper.success(snapshot as SnapshotResponseDto);
  }

  @Get(':resumeId/history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get analytics history' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @SwaggerResponse({ status: 200, type: [SnapshotResponseDto] })
  async getHistory(
    @Param('resumeId') resumeId: string,
    @Query() query: HistoryQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AppApiResponse<SnapshotResponseDto[]>> {
    const history = await this.analyticsService.getHistory(
      resumeId,
      user.id,
      query,
    );

    return ApiResponseHelper.success(history as SnapshotResponseDto[]);
  }

  @Get(':resumeId/progression')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get score progression over time' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @SwaggerResponse({ status: 200, type: ScoreProgressionResponseDto })
  async getProgression(
    @Param('resumeId') resumeId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<AppApiResponse<ScoreProgressionResponseDto>> {
    const progression = await this.analyticsService.getScoreProgression(
      resumeId,
      user.id,
    );

    return ApiResponseHelper.success(
      progression as ScoreProgressionResponseDto,
    );
  }
}
