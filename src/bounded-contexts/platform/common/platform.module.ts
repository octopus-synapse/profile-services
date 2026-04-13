/**
 * Platform Module
 *
 * Module for platform-wide services and controllers.
 */

import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@/bounded-contexts/identity/authorization';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { ResumesCoreModule } from '@/bounded-contexts/resumes/core/resumes.module';
import { SectionTypeRepository } from '@/bounded-contexts/resumes/infrastructure/repositories';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { EnumsController } from './controllers/enums.controller';
import { PlatformStatsController } from './controllers/platform-stats.controller';
import { AdminDashboardService } from './services/admin-dashboard.service';
import { PlatformStatsService } from './services/platform-stats.service';
import { SectionTypesService } from './services/section-types.service';

@Module({
  imports: [PrismaModule, AuthorizationModule, ResumesCoreModule],
  controllers: [PlatformStatsController, EnumsController, AdminDashboardController],
  providers: [
    PlatformStatsService,
    SectionTypeRepository,
    SectionTypesService,
    AdminDashboardService,
  ],
  exports: [PlatformStatsService],
})
export class PlatformModule {}
