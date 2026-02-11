/**
 * Platform Module
 *
 * Module for platform-wide services and controllers.
 */

import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@/bounded-contexts/identity/authorization';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { ResumesModule } from '@/bounded-contexts/resumes/resumes/resumes.module';
import { EnumsController } from './controllers/enums.controller';
import { PlatformStatsController } from './controllers/platform-stats.controller';
import { PlatformStatsService } from './services/platform-stats.service';

@Module({
  imports: [PrismaModule, AuthorizationModule, ResumesModule],
  controllers: [PlatformStatsController, EnumsController],
  providers: [PlatformStatsService],
  exports: [PlatformStatsService],
})
export class PlatformModule {}
