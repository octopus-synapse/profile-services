import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ResumeAnalyticsModule } from '@/bounded-contexts/analytics/resume-analytics/resume-analytics.module';
import { EmailModule } from '@/bounded-contexts/platform/common/email/email.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { ResumeVersionsModule } from '@/bounded-contexts/resumes/resume-versions/resume-versions.module';
import { ApplyModeController } from './controllers/apply-mode.controller';
import { ApplyModeService } from './services/apply-mode.service';
import { CuratedSelectorService } from './services/curated-selector.service';
import { AUTO_APPLY_QUEUE, AutoApplyWorker } from './workers/auto-apply.worker';
import { WEEKLY_CURATED_QUEUE, WeeklyCuratedWorker } from './workers/weekly-curated.worker';

/**
 * Automation — Weekly Curated digest + Auto-Apply engine.
 *
 * Both workers are BullMQ processors that self-register a repeating cron on
 * module init. The root BullModule (already configured in the platform jobs
 * module with Redis connection + defaultJobOptions) handles the connection.
 * We only register the queues we own here.
 */
@Module({
  imports: [
    PrismaModule,
    EmailModule,
    ResumeAnalyticsModule,
    ResumeVersionsModule,
    BullModule.registerQueue({ name: WEEKLY_CURATED_QUEUE }, { name: AUTO_APPLY_QUEUE }),
  ],
  controllers: [ApplyModeController],
  providers: [ApplyModeService, CuratedSelectorService, WeeklyCuratedWorker, AutoApplyWorker],
  exports: [CuratedSelectorService],
})
export class AutomationModule {}
