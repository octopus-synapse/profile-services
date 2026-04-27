/**
 * Notifications Module
 *
 * Thin Nest shell over `buildNotificationsUseCases`. Wiring lives in
 * `notifications.composition.ts`. Workers + cron schedulers are
 * registered via `registerNotificationsJobs` against the global
 * `JobQueuePort` / `CronPort` (no `@Processor`/`@Cron` decorators
 * here).
 *
 * The SSE stream subscribes to Nest's `EventEmitter2` via a synthesized
 * Route descriptor (`notificationsSseRoutes`). The bundle
 * (`NotificationsSseBundle`) is framework-free; this module wires it
 * by handing the emitter to `makeNotificationsSseBundle`.
 */

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
import { CronPort } from '@/shared-kernel/jobs/cron.port';
import { JobQueuePort } from '@/shared-kernel/jobs/job-queue.port';
import { NotificationsUseCases } from './application/ports/notifications.port';
import type { NotificationStreamEvent } from './domain/entities/notification';
import { NotificationStreamPort } from './domain/ports/notification-stream.port';
import { EventEmitterNotificationStreamAdapter } from './infrastructure/adapters/external-services/event-emitter-notification-stream.adapter';
import { FitProfileExpiredNotificationHandler } from './infrastructure/handlers/fit-profile-expired.handler';
import { ResumeQualityRankNotificationHandler } from './infrastructure/handlers/resume-quality-rank.handler';
import {
  buildNotificationsUseCases,
  registerNotificationsJobs,
} from './notifications.composition';
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
  imports: [PrismaModule, EventEmitterModule, EmailModule, CacheModule],
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

    // Side-effect provider: registers cron schedulers + BullMQ workers
    // against the shared ports at module-init time.
    {
      provide: 'NOTIFICATIONS_JOBS_REGISTERED',
      useFactory: (
        queue: JobQueuePort,
        cron: CronPort,
        bundle: NotificationsUseCases,
        logger: LoggerPort,
      ) => {
        registerNotificationsJobs(queue, cron, bundle, logger);
        return true;
      },
      inject: [JobQueuePort, CronPort, NotificationsUseCases, LoggerPort],
    },

    // Nest-decorated handlers (consume the bundle).
    FitProfileExpiredNotificationHandler,
    ResumeQualityRankNotificationHandler,
  ],
  exports: [NotificationsUseCases],
})
export class NotificationsModule {}
