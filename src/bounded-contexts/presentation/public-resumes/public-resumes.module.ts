import { Module } from '@nestjs/common';
import { ShareAnalyticsModule } from '@/bounded-contexts/analytics/share-analytics/share-analytics.module';
import { CacheModule } from '@/bounded-contexts/platform/common/cache/cache.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PublicResumeController } from './controllers/public-resume.controller';
import { ShareManagementController } from './controllers/share-management.controller';
import { ResumeShareService } from './services/resume-share.service';

@Module({
  imports: [PrismaModule, CacheModule, ShareAnalyticsModule],
  controllers: [PublicResumeController, ShareManagementController],
  providers: [ResumeShareService],
  exports: [ResumeShareService],
})
export class PublicResumesModule {}
