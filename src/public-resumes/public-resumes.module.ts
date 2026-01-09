import { Module } from '@nestjs/common';
import { PublicResumeController } from './controllers/public-resume.controller';
import { ResumeShareService } from './services/resume-share.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../common/cache/cache.module';
import { ShareAnalyticsModule } from '../share-analytics/share-analytics.module';

@Module({
  imports: [PrismaModule, CacheModule, ShareAnalyticsModule],
  controllers: [PublicResumeController],
  providers: [ResumeShareService],
  exports: [ResumeShareService],
})
export class PublicResumesModule {}
