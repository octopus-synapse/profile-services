import { Module } from '@nestjs/common';
import { ShareAnalyticsController } from './controllers/share-analytics.controller';
import { ShareAnalyticsService } from './services/share-analytics.service';
import { ShareAnalyticsRepository } from './repositories';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ShareAnalyticsController],
  providers: [ShareAnalyticsService, ShareAnalyticsRepository],
  exports: [ShareAnalyticsService],
})
export class ShareAnalyticsModule {}
