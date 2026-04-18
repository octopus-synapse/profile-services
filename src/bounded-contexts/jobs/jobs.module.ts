import { Module } from '@nestjs/common';
import { ResumeAnalyticsModule } from '@/bounded-contexts/analytics/resume-analytics/resume-analytics.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { JobController } from './controllers/job.controller';
import { JobService } from './services/job.service';
import { ApplicationTrackerController } from './tracker/application-tracker.controller';
import { ApplicationTrackerService } from './tracker/application-tracker.service';

@Module({
  imports: [PrismaModule, ResumeAnalyticsModule],
  controllers: [JobController, ApplicationTrackerController],
  providers: [JobService, ApplicationTrackerService],
  exports: [JobService, ApplicationTrackerService],
})
export class JobsModule {}
