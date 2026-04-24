import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CacheModule } from '@/bounded-contexts/platform/common/cache/cache.module';
import { EmailModule } from '@/bounded-contexts/platform/common/email/email.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { NotificationController } from './controllers/notification.controller';
import { NotificationsSseController } from './controllers/notifications-sse.controller';
import { FitProfileExpiredNotificationHandler } from './handlers/fit-profile-expired.handler';
import { ResumeQualityRankNotificationHandler } from './handlers/resume-quality-rank.handler';
import {
  FIT_PROFILE_EXPIRY_REMINDER_QUEUE,
  FitProfileExpiryReminderWorker,
} from './services/fit-profile-expiry-reminder.worker';
import { NotificationService } from './services/notification.service';
import { NotificationDigestWorker } from './services/notification-digest.worker';
import { WeeklyDigestService } from './services/weekly-digest.service';
import { WeeklyDigestWorker } from './services/weekly-digest.worker';

@Module({
  imports: [
    PrismaModule,
    EventEmitterModule,
    EmailModule,
    CacheModule,
    BullModule.registerQueue({ name: FIT_PROFILE_EXPIRY_REMINDER_QUEUE }),
  ],
  controllers: [NotificationController, NotificationsSseController],
  providers: [
    NotificationService,
    NotificationDigestWorker,
    WeeklyDigestService,
    WeeklyDigestWorker,
    FitProfileExpiredNotificationHandler,
    ResumeQualityRankNotificationHandler,
    FitProfileExpiryReminderWorker,
  ],
  exports: [NotificationService, WeeklyDigestService],
})
export class NotificationsModule {}
