import { Module } from '@nestjs/common';
import { ShareAnalyticsController } from './controllers/share-analytics.controller';
import { ShareAnalyticsService } from './services/share-analytics.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ShareAnalyticsController],
  providers: [ShareAnalyticsService],
  exports: [ShareAnalyticsService],
})
export class ShareAnalyticsModule {}
