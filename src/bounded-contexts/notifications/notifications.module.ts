import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EmailModule } from '@/bounded-contexts/platform/common/email/email.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { NotificationController } from './controllers/notification.controller';
import { NotificationsSseController } from './controllers/notifications-sse.controller';
import { NotificationService } from './services/notification.service';
import { NotificationDigestWorker } from './services/notification-digest.worker';
import { WeeklyDigestService } from './services/weekly-digest.service';
import { WeeklyDigestWorker } from './services/weekly-digest.worker';

@Module({
  imports: [PrismaModule, EventEmitterModule, EmailModule],
  controllers: [NotificationController, NotificationsSseController],
  providers: [
    NotificationService,
    NotificationDigestWorker,
    WeeklyDigestService,
    WeeklyDigestWorker,
  ],
  exports: [NotificationService, WeeklyDigestService],
})
export class NotificationsModule {}
