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
 * while preserving a stable controller API.
 *
 * Event Handlers:
 * - ResumeCreatedHandler: Initializes analytics on resume creation
 * - ResumeUpdatedHandler: Tracks field updates for analytics patterns
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import {
  ANALYTICS_RECORDER,
  InitializeAnalyticsOnUserRegisteredHandler,
  ResumeCreatedHandler,
  ResumeUpdatedHandler,
  SyncProjectionOnResumeCreatedHandler,
  SyncProjectionOnResumeDeletedHandler,
  SyncProjectionOnSectionAddedHandler,
  SyncProjectionOnSectionRemovedHandler,
  SyncProjectionOnSectionUpdatedHandler,
  VIEW_TRACKER,
} from '../application/handlers';
import { AnalyticsRecorderAdapter, ViewTrackerAdapter } from '../infrastructure/adapters';
import { AnalyticsSseController } from './controllers/analytics-sse.controller';
import { ResumeAnalyticsController } from './controllers/resume-analytics.controller';
import { SNAPSHOT_PORT, VIEW_TRACKING_PORT } from './ports';
import { ATSScoreService } from './services/ats-score.service';
import { BenchmarkService } from './services/benchmark.service';
import { DashboardService } from './services/dashboard.service';
import { KeywordAnalysisService } from './services/keyword-analysis.service';
import { ResumeAnalyticsFacade } from './services/resume-analytics.facade';
import { SnapshotService } from './services/snapshot.service';
import { ViewTrackingService } from './services/view-tracking.service';

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
    // Dashboard Ports
    {
      provide: VIEW_TRACKING_PORT,
      useExisting: ViewTrackingService,
    },
    {
      provide: SNAPSHOT_PORT,
      useExisting: SnapshotService,
    },
  ],
  exports: [ResumeAnalyticsFacade],
})
export class ResumeAnalyticsModule {}
