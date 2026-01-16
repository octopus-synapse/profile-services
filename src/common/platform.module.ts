/**
 * Platform Module
 *
 * Module for platform-wide services and controllers.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthorizationModule } from '../authorization';
import { PlatformStatsService } from './services/platform-stats.service';
import { PlatformStatsController } from './controllers/platform-stats.controller';

@Module({
  imports: [PrismaModule, AuthorizationModule],
  controllers: [PlatformStatsController],
  providers: [PlatformStatsService],
  exports: [PlatformStatsService],
})
export class PlatformModule {}
