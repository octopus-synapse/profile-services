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
 * Architecture: Decomposed into focused services for maintainability.
 * @see ADR-000X — Enforce Disciplined, Persona-Aware Engineering
 */

import { Module } from '@nestjs/common';
import { ResumeAnalyticsController } from './controllers/resume-analytics.controller';
import { ResumeAnalyticsService } from './services/resume-analytics.service';
import { ViewTrackingService } from './services/view-tracking.service';
import { ATSScoreService } from './services/ats-score.service';
import { KeywordAnalyzerService } from './services/keyword-analyzer.service';
import { BenchmarkingService } from './services/benchmarking.service';
import { SnapshotService } from './services/snapshot.service';
import { AnalyticsRepository } from './repositories';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ResumeAnalyticsController],
  providers: [
    // Repository (data access layer)
    AnalyticsRepository,
    // Orchestrator
    ResumeAnalyticsService,
    // Focused sub-services
    ViewTrackingService,
    ATSScoreService,
    KeywordAnalyzerService,
    BenchmarkingService,
    SnapshotService,
  ],
  exports: [
    AnalyticsRepository,
    ResumeAnalyticsService,
    ViewTrackingService,
    ATSScoreService,
    KeywordAnalyzerService,
    BenchmarkingService,
    SnapshotService,
  ],
})
export class ResumeAnalyticsModule {}
