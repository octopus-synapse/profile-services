/**
 * Notifications Module
 *
 * Thin Nest shell over `buildNotificationsUseCases`. Wiring lives in
 * `notifications.composition.ts`. Workers + cron schedulers are
 * registered via `registerNotificationsJobs` against the global
 * `JobQueuePort` / `CronPort` (no `@Processor`/`@Cron` decorators
 * here).
 *
 * The SSE stream consumes the global `SseStreamPort` (whose adapter
 * sits inside `infrastructure/nest-adapter` and is the only place that
 * knows about `EventEmitter2`). The bundle (`NotificationsSseBundle`)
 * is framework-free; this module wires it by handing the port to
 * `makeNotificationsSseBundle`.
 */

import { Module } from '@nestjs/common';
import { filter, map } from 'rxjs';
import { CacheModule } from '@/bounded-contexts/platform/common/cache/cache.module';
import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import { EmailModule } from '@/bounded-contexts/platform/common/email/email.module';
import { EmailService } from '@/bounded-contexts/platform/common/email/email.service';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { EventBusPort, LoggerPort } from '@/shared-kernel';
import { SseStreamPort } from '@/shared-kernel/http/sse-stream.port';
import { CronPort } from '@/shared-kernel/jobs/cron.port';
import { JobQueuePort } from '@/shared-kernel/jobs/job-queue.port';
import { NotificationsUseCases } from './application/ports/notifications.port';
import type { NotificationStreamEvent } from './domain/entities/notification';
import { NotificationStreamPort } from './domain/ports/notification-stream.port';
import { EventEmitterNotificationStreamAdapter } from './infrastructure/adapters/external-services/event-emitter-notification-stream.adapter';
import { registerNotificationsHandlers } from './infrastructure/handlers/register-handlers';
import {
  buildNotificationsUseCases,
  registerNotificationsJobs,
} from './notifications.composition';
import {
  NotificationsSseBundle,
  notificationsRoutes,
  notificationsSseRoutes,
} from './notifications.routes';

function makeNotificationsSseBundle(sseStream: SseStreamPort): NotificationsSseBundle {
  return {
    subscribeToUserStream: (userId: string) =>
      sseStream.subscribe<NotificationStreamEvent>(`notif:user:${userId}`).pipe(
        filter((event): event is { data: NotificationStreamEvent } => Boolean(event.data)),
        map(({ data: n }) => ({ data: n, id: n.id, type: 'notification', retry: 10000 })),
      ),
  };
}

@Module({
  imports: [PrismaModule, EmailModule, CacheModule],
  controllers: [
    ...synthesizeRouteControllers(NotificationsUseCases, notificationsRoutes),
    ...synthesizeRouteControllers(NotificationsSseBundle, notificationsSseRoutes),
  ],
  providers: [
    EventEmitterNotificationStreamAdapter,
    { provide: NotificationStreamPort, useExisting: EventEmitterNotificationStreamAdapter },
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
      useFactory: (sseStream: SseStreamPort) => makeNotificationsSseBundle(sseStream),
      inject: [SseStreamPort],
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

    // Side-effect provider: register framework-free `@OnEvent`
    // replacements via `EventBusPort.on(...)`.
    {
      provide: 'NOTIFICATIONS_HANDLERS_REGISTERED',
      useFactory: (
        eventBus: EventBusPort,
        bc: NotificationsUseCases,
        logger: LoggerPort,
      ): boolean => {
        registerNotificationsHandlers({ eventBus, bc, logger });
        return true;
      },
      inject: [EventBusPort, NotificationsUseCases, LoggerPort],
    },
  ],
  exports: [NotificationsUseCases],
})
export class NotificationsModule {}
