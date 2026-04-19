import { Module } from '@nestjs/common';
import { ResumeAnalyticsModule } from '@/bounded-contexts/analytics/resume-analytics/resume-analytics.module';
import { EmailModule } from '@/bounded-contexts/platform/common/email/email.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { JobController } from './controllers/job.controller';
import { JobService } from './services/job.service';
import { AntiGhostingService } from './tracker/anti-ghosting.service';
import { AntiGhostingWorker } from './tracker/anti-ghosting.worker';
import { ApplicationTrackerController } from './tracker/application-tracker.controller';
import { ApplicationTrackerService } from './tracker/application-tracker.service';

@Module({
  imports: [PrismaModule, ResumeAnalyticsModule, EmailModule],
  controllers: [JobController, ApplicationTrackerController],
  providers: [JobService, ApplicationTrackerService, AntiGhostingService, AntiGhostingWorker],
  exports: [JobService, ApplicationTrackerService, AntiGhostingService],
})
export class JobsModule {}
