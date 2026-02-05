/**
 * Platform Module
 *
 * Module for platform-wide services and controllers.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { AuthorizationModule } from '@/bounded-contexts/identity/authorization';
import { ResumesModule } from '@/bounded-contexts/resumes/resumes/resumes.module';
import { PlatformStatsService } from './services/platform-stats.service';
import { PlatformStatsController } from './controllers/platform-stats.controller';
import { EnumsController } from './controllers/enums.controller';

@Module({
  imports: [PrismaModule, AuthorizationModule, ResumesModule],
  controllers: [PlatformStatsController, EnumsController],
  providers: [PlatformStatsService],
  exports: [PlatformStatsService],
})
export class PlatformModule {}
