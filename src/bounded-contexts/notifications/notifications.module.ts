/**
 * Notifications Module
 *
 * Thin Nest shell over `buildNotificationsUseCases`. Wiring lives in
 * `notifications.composition.ts`. Workers and `@OnEvent` handlers stay
 * Nest-decorated here — they consume the bundle as a constructor
 * dependency.
 *
 * The SSE stream subscribes to Nest's `EventEmitter2` via a synthesized
 * Route descriptor (`notificationsSseRoutes`). The bundle
 * (`NotificationsSseBundle`) is framework-free; this module wires it
 * by handing the emitter to `makeNotificationsSseBundle`.
 */

import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { filter, fromEvent, map } from 'rxjs';
import { CacheModule } from '@/bounded-contexts/platform/common/cache/cache.module';
import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import { EmailModule } from '@/bounded-contexts/platform/common/email/email.module';
import { EmailService } from '@/bounded-contexts/platform/common/email/email.service';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { LoggerPort } from '@/shared-kernel';
import { NotificationsUseCases } from './application/ports/notifications.port';
import type { NotificationStreamEvent } from './domain/entities/notification';
import { NotificationStreamPort } from './domain/ports/notification-stream.port';
import { EventEmitterNotificationStreamAdapter } from './infrastructure/adapters/external-services/event-emitter-notification-stream.adapter';
import { FitProfileExpiredNotificationHandler } from './infrastructure/handlers/fit-profile-expired.handler';
import { ResumeQualityRankNotificationHandler } from './infrastructure/handlers/resume-quality-rank.handler';
import {
  FIT_PROFILE_EXPIRY_REMINDER_QUEUE,
  FitProfileExpiryReminderWorker,
} from './infrastructure/workers/fit-profile-expiry-reminder.worker';
import { NotificationDigestWorker } from './infrastructure/workers/notification-digest.worker';
import { WeeklyDigestWorker } from './infrastructure/workers/weekly-digest.worker';
import { buildNotificationsUseCases } from './notifications.composition';
import {
  NotificationsSseBundle,
  notificationsRoutes,
  notificationsSseRoutes,
} from './notifications.routes';

function makeNotificationsSseBundle(emitter: EventEmitter2): NotificationsSseBundle {
  return {
    subscribeToUserStream: (userId: string) =>
      fromEvent<NotificationStreamEvent>(emitter, `notif:user:${userId}`).pipe(
        filter((n): n is NotificationStreamEvent => Boolean(n)),
        map((n) => ({ data: n, id: n.id, type: 'notification', retry: 10000 })),
      ),
  };
}

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
    ...synthesizeRouteControllers(NotificationsSseBundle, notificationsSseRoutes),
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
    {
      provide: NotificationsSseBundle,
      useFactory: (emitter: EventEmitter2) => makeNotificationsSseBundle(emitter),
      inject: [EventEmitter2],
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
