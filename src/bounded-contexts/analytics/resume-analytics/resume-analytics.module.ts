/**
 * Resume Analytics Module
 *
 * Provides resume insights and analytics:
 * - View tracking with time-series data
 * - ATS score calculation
 * - Keyword optimization
 * - Industry benchmarking
 * - Historical tracking
 *
 * Architecture: Clean Architecture with Facade pattern
 * The ResumeAnalyticsFacade orchestrates specialized services
 * maintaining backward compatibility with controller API.
 *
 * Event Handlers:
 * - ResumeCreatedHandler: Initializes analytics on resume creation
 * - ResumeUpdatedHandler: Tracks field updates for analytics patterns
 */

import { Module } from '@nestjs/common';
import { ResumeAnalyticsController } from './controllers/resume-analytics.controller';
import { AnalyticsSseController } from './controllers/analytics-sse.controller';
import { ResumeAnalyticsFacade } from './services/resume-analytics.facade';
import { ViewTrackingService } from './services/view-tracking.service';
import { ATSScoreService } from './services/ats-score.service';
import { KeywordAnalysisService } from './services/keyword-analysis.service';
import { BenchmarkService } from './services/benchmark.service';
import { SnapshotService } from './services/snapshot.service';
import { DashboardService } from './services/dashboard.service';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import {
  ResumeCreatedHandler,
  ResumeUpdatedHandler,
  InitializeAnalyticsOnUserRegisteredHandler,
  SyncProjectionOnResumeCreatedHandler,
  SyncProjectionOnResumeDeletedHandler,
  SyncProjectionOnSectionAddedHandler,
  SyncProjectionOnSectionUpdatedHandler,
  SyncProjectionOnSectionRemovedHandler,
  ANALYTICS_RECORDER,
  VIEW_TRACKER,
} from '../application/handlers';
import {
  AnalyticsRecorderAdapter,
  ViewTrackerAdapter,
} from '../infrastructure/adapters';

@Module({
  imports: [PrismaModule],
  controllers: [ResumeAnalyticsController, AnalyticsSseController],
  providers: [
    // Domain Services
    ResumeAnalyticsFacade,
    ViewTrackingService,
    ATSScoreService,
    KeywordAnalysisService,
    BenchmarkService,
    SnapshotService,
    DashboardService,
    // Event Handlers
    ResumeCreatedHandler,
    ResumeUpdatedHandler,
    InitializeAnalyticsOnUserRegisteredHandler,
    // Projection Sync Handlers
    SyncProjectionOnResumeCreatedHandler,
    SyncProjectionOnResumeDeletedHandler,
    SyncProjectionOnSectionAddedHandler,
    SyncProjectionOnSectionUpdatedHandler,
    SyncProjectionOnSectionRemovedHandler,
    // Port Adapters
    {
      provide: ANALYTICS_RECORDER,
      useClass: AnalyticsRecorderAdapter,
    },
    {
      provide: VIEW_TRACKER,
      useClass: ViewTrackerAdapter,
    },
  ],
  exports: [ResumeAnalyticsFacade],
})
export class ResumeAnalyticsModule {}
