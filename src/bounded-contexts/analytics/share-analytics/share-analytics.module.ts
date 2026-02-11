import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { ShareAnalyticsController } from './controllers/share-analytics.controller';
import { ShareAnalyticsService } from './services/share-analytics.service';

@Module({
  imports: [PrismaModule],
  controllers: [ShareAnalyticsController],
  providers: [ShareAnalyticsService],
  exports: [ShareAnalyticsService],
})
export class ShareAnalyticsModule {}
