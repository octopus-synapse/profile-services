/**
 * Resume Analytics Module
 *
 * Provides resume insights and analytics:
 * - View tracking with time-series data
 * - ATS score calculation
 * - Keyword optimization
 * - Industry benchmarking
 * - Historical tracking
 */

import { Module } from '@nestjs/common';
import { ResumeAnalyticsController } from './controllers/resume-analytics.controller';
import { ResumeAnalyticsService } from './services/resume-analytics.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ResumeAnalyticsController],
  providers: [ResumeAnalyticsService],
  exports: [ResumeAnalyticsService],
})
export class ResumeAnalyticsModule {}
