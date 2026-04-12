/**
 * Analytics Module - ADR-002: Modular Hexagonal Architecture
 *
 * Submodules: Resume Analytics, Search, Share Analytics
 */

import { Module } from '@nestjs/common';
import { ResumeAnalyticsModule } from './resume-analytics/resume-analytics.module';
import { SearchModule } from './search/search.module';
import { ShareAnalyticsModule } from './share-analytics/share-analytics.module';

@Module({
  imports: [ResumeAnalyticsModule, SearchModule, ShareAnalyticsModule],
  exports: [ResumeAnalyticsModule, SearchModule, ShareAnalyticsModule],
})
export class AnalyticsModule {}
