/**
 * Notifications Module
 *
 * Thin Nest shell over `buildNotificationsUseCases`. Wiring lives in
 * `notifications.composition.ts`. Workers and `@OnEvent` handlers stay
 * Nest-decorated here — they consume the bundle as a constructor
 * dependency.
 *
 * The SSE stream is a small Nest-shaped adapter (`EventEmitter2`) built
 * inline because composition.ts must stay framework-free; once we
 * have an `EventBusPort` this disappears.
 */

import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { CacheModule } from '@/bounded-contexts/platform/common/cache/cache.module';
import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import { EmailModule } from '@/bounded-contexts/platform/common/email/email.module';
import { EmailService } from '@/bounded-contexts/platform/common/email/email.service';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { LoggerPort } from '@/shared-kernel';
import { NotificationsUseCases } from './application/ports/notifications.port';
import { NotificationStreamPort } from './domain/ports/notification-stream.port';
import { EventEmitterNotificationStreamAdapter } from './infrastructure/adapters/external-services/event-emitter-notification-stream.adapter';
import { NotificationsSseController } from './infrastructure/controllers/notifications-sse.controller';
import { FitProfileExpiredNotificationHandler } from './infrastructure/handlers/fit-profile-expired.handler';
import { ResumeQualityRankNotificationHandler } from './infrastructure/handlers/resume-quality-rank.handler';
import {
  FIT_PROFILE_EXPIRY_REMINDER_QUEUE,
  FitProfileExpiryReminderWorker,
} from './infrastructure/workers/fit-profile-expiry-reminder.worker';
import { NotificationDigestWorker } from './infrastructure/workers/notification-digest.worker';
import { WeeklyDigestWorker } from './infrastructure/workers/weekly-digest.worker';
import { buildNotificationsUseCases } from './notifications.composition';
import { notificationsRoutes } from './notifications.routes';

@Module({
  imports: [
    PrismaModule,
    EventEmitterModule,
    EmailModule,
    CacheModule,
    BullModule.registerQueue({ name: FIT_PROFILE_EXPIRY_REMINDER_QUEUE }),
  ],
  controllers: [
    ...synthesizeRouteControllers(NotificationsUseCases, notificationsRoutes),
    NotificationsSseController,
  ],
  providers: [
    {
      provide: NotificationStreamPort,
      useFactory: (emitter: EventEmitter2) => new EventEmitterNotificationStreamAdapter(emitter),
      inject: [EventEmitter2],
    },
    {
      provide: NotificationsUseCases,
      useFactory: (
        prisma: PrismaService,
        email: EmailService,
        cache: CacheService,
        stream: NotificationStreamPort,
        logger: LoggerPort,
      ) => buildNotificationsUseCases(prisma, email, cache, stream, logger),
      inject: [PrismaService, EmailService, CacheService, NotificationStreamPort, LoggerPort],
    },

    // Nest-decorated handlers + workers (consume the bundle).
    FitProfileExpiredNotificationHandler,
    ResumeQualityRankNotificationHandler,
    NotificationDigestWorker,
    WeeklyDigestWorker,
    FitProfileExpiryReminderWorker,
  ],
  exports: [NotificationsUseCases],
})
export class NotificationsModule {}
