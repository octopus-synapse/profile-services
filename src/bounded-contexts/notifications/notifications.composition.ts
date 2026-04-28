/**
 * Pure-TS wiring for the notifications BC. Zero `@nestjs/*` imports.
 *
 * Phase-1 canonical shape: `buildNotificationsComposition(...)` returns
 * `{ useCases, routes, eventHandlers, workers, lifecycles }` as a
 * `BoundedContextComposition`. The Elysia bootstrap concatenates this
 * with every other BC's composition; the Nest shell (`*.module.ts`)
 * adapts the same composition to Nest's DI graph.
 *
 * SSE: the BC owns the `notif:user:{userId}` channel. Use-cases
 * publish through a `NotificationStreamPort` shim that fans into the
 * shared `SseStreamPort.publish(...)`. Routes that live on the SSE
 * bundle (declared `kind: 'sse'`) read back via
 * `SseStreamPort.subscribe(...)`. Both ends share the same in-process
 * channel id.
 *
 * Background jobs:
 *  - `fit-profile-expiry-reminder` BullMQ-shaped queue: surfaced as a
 *    `BcWorkerBinding` (composition `workers`).
 *  - The daily fan-out tick + the daily/weekly digest crons live in a
 *    `lifecycle.init()` so we don't re-run them on hot-reload.
 */

import { filter, map } from 'rxjs';
import { UserFitProfileUpdatedEvent } from '@/bounded-contexts/fit-profile/domain/events';
import type { EmailService } from '@/bounded-contexts/platform/common/email/email.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ResumeQualityComputedEvent } from '@/bounded-contexts/resume-quality/domain/events';
import type { EventBusPort, LoggerPort } from '@/shared-kernel';
import type { CachePort } from '@/shared-kernel/cache/cache.port';
import type {
  BcEventBinding,
  BcWorkerBinding,
  BoundedContextComposition,
} from '@/shared-kernel/composition';
import type { SseStreamPort } from '@/shared-kernel/http/sse-stream.port';
import type { CronPort } from '@/shared-kernel/jobs/cron.port';
import type { JobQueuePort } from '@/shared-kernel/jobs/job-queue.port';
import type { Lifecycle } from '@/shared-kernel/lifecycle/lifecycle.port';
import { NotificationsUseCases } from './application/ports/notifications.port';
import { CreateNotificationUseCase } from './application/use-cases/create-notification/create-notification.use-case';
import { DeleteOldNotificationsUseCase } from './application/use-cases/delete-old-notifications/delete-old-notifications.use-case';
import { EnqueueExpiryRemindersUseCase } from './application/use-cases/enqueue-expiry-reminders/enqueue-expiry-reminders.use-case';
import { GetPreferencesUseCase } from './application/use-cases/get-preferences/get-preferences.use-case';
import { GetUnreadCountUseCase } from './application/use-cases/get-unread-count/get-unread-count.use-case';
import { ListNotificationsUseCase } from './application/use-cases/list-notifications/list-notifications.use-case';
import { MarkNotificationsReadUseCase } from './application/use-cases/mark-notifications-read/mark-notifications-read.use-case';
import { NotifyFitProfileExpiredUseCase } from './application/use-cases/notify-fit-profile-expired/notify-fit-profile-expired.use-case';
import { NotifyResumeQualityRankChangeUseCase } from './application/use-cases/notify-resume-quality-rank-change/notify-resume-quality-rank-change.use-case';
import { SendDailyDigestsUseCase } from './application/use-cases/send-daily-digests/send-daily-digests.use-case';
import { SendExpiryReminderUseCase } from './application/use-cases/send-expiry-reminder/send-expiry-reminder.use-case';
import { SendWeeklyDigestsUseCase } from './application/use-cases/send-weekly-digests/send-weekly-digests.use-case';
import { SetPreferenceUseCase } from './application/use-cases/set-preference/set-preference.use-case';
import type { NotificationStreamEvent } from './domain/entities/notification';
import type { NotificationStreamPort } from './domain/ports/notification-stream.port';
import { CacheReminderStateAdapter } from './infrastructure/adapters/external-services/cache-reminder-state.adapter';
import { EventEmitterNotificationStreamAdapter } from './infrastructure/adapters/external-services/event-emitter-notification-stream.adapter';
import { PlatformEmailAdapter } from './infrastructure/adapters/external-services/platform-email.adapter';
import { PrismaFitProfileExpiryAdapter } from './infrastructure/adapters/persistence/prisma-fit-profile-expiry.adapter';
import { PrismaNotificationsRepository } from './infrastructure/adapters/persistence/prisma-notifications.repository';
import { PrismaResumeQualitySnapshotAdapter } from './infrastructure/adapters/persistence/prisma-resume-quality-snapshot.adapter';
import { PrismaWeeklyDigestLogAdapter } from './infrastructure/adapters/persistence/prisma-weekly-digest-log.adapter';
import { PrismaWeeklyDigestStatsAdapter } from './infrastructure/adapters/persistence/prisma-weekly-digest-stats.adapter';
import { FitProfileExpiredNotificationHandler } from './infrastructure/handlers/fit-profile-expired.handler';
import { ResumeQualityRankNotificationHandler } from './infrastructure/handlers/resume-quality-rank.handler';
import {
  FIT_PROFILE_EXPIRY_REMINDER_QUEUE,
  type FitProfileExpiryReminderJobData,
  FitProfileExpiryReminderWorker,
} from './infrastructure/workers/fit-profile-expiry-reminder.worker';
import { NotificationDigestWorker } from './infrastructure/workers/notification-digest.worker';
import { WeeklyDigestWorker } from './infrastructure/workers/weekly-digest.worker';
import {
  NotificationsSseBundle,
  notificationsRoutes,
  notificationsSseRoutes,
} from './notifications.routes';

export { NotificationsUseCases };

/**
 * Builds the `NotificationsSseBundle` over a `SseStreamPort`. The
 * bundle's only job is to translate the in-process
 * `notif:user:{userId}` channel into the typed SSE event shape the
 * route descriptor returns. Kept exported so the Nest shell can
 * reuse it through `useFactory`.
 */
export function buildNotificationsSseBundle(sse: SseStreamPort): NotificationsSseBundle {
  return {
    subscribeToUserStream: (userId: string) =>
      sse.subscribe<NotificationStreamEvent>(`notif:user:${userId}`).pipe(
        filter((event): event is { data: NotificationStreamEvent } => Boolean(event.data)),
        map(({ data: n }) => ({ data: n, id: n.id, type: 'notification', retry: 10000 })),
      ),
  };
}

/**
 * Build the framework-free use-case bundle. Constructs the
 * `NotificationStreamPort` shim internally from the shared
 * `SseStreamPort`, so callers don't have to wire the adapter
 * themselves.
 */
export function buildNotificationsUseCases(
  prisma: PrismaService,
  email: EmailService,
  cache: CachePort,
  logger: LoggerPort,
  sse: SseStreamPort,
): NotificationsUseCases {
  const stream: NotificationStreamPort = new EventEmitterNotificationStreamAdapter(sse);

  const repository = new PrismaNotificationsRepository(prisma);
  const stats = new PrismaWeeklyDigestStatsAdapter(prisma);
  const digestLog = new PrismaWeeklyDigestLogAdapter(prisma);
  const fitProfileExpiry = new PrismaFitProfileExpiryAdapter(prisma);
  const resumeQualitySnapshot = new PrismaResumeQualitySnapshotAdapter(prisma);
  const emailAdapter = new PlatformEmailAdapter(email);
  const reminderState = new CacheReminderStateAdapter(cache);

  const createNotification = new CreateNotificationUseCase(
    repository,
    stream,
    emailAdapter,
    logger,
  );

  return {
    createNotification,
    listNotifications: new ListNotificationsUseCase(repository),
    getUnreadCount: new GetUnreadCountUseCase(repository),
    markNotificationsRead: new MarkNotificationsReadUseCase(repository),
    getPreferences: new GetPreferencesUseCase(repository),
    setPreference: new SetPreferenceUseCase(repository),
    deleteOldNotifications: new DeleteOldNotificationsUseCase(repository),
    sendDailyDigests: new SendDailyDigestsUseCase(repository, emailAdapter, logger),
    sendWeeklyDigests: new SendWeeklyDigestsUseCase(
      repository,
      stats,
      digestLog,
      emailAdapter,
      logger,
    ),
    notifyFitProfileExpired: new NotifyFitProfileExpiredUseCase(createNotification, logger),
    notifyResumeQualityRankChange: new NotifyResumeQualityRankChangeUseCase(
      resumeQualitySnapshot,
      createNotification,
      logger,
    ),
    enqueueExpiryReminders: new EnqueueExpiryRemindersUseCase(
      fitProfileExpiry,
      reminderState,
      logger,
    ),
    sendExpiryReminder: new SendExpiryReminderUseCase(reminderState, createNotification, logger),
  };
}

/**
 * Registers cron-driven workers + fan-out tick against the shared
 * `JobQueuePort` / `CronPort`. Kept exported for the Nest shell's
 * side-effect provider; the Elysia path runs the same logic through
 * `lifecycles[0].init()` from the composition.
 */
export function registerNotificationsJobs(
  queue: JobQueuePort,
  cron: CronPort,
  bundle: NotificationsUseCases,
  logger: LoggerPort,
): void {
  const dailyDigest = new NotificationDigestWorker(bundle, logger);
  cron.register({ pattern: '0 8 * * *' }, dailyDigest.run.bind(dailyDigest));

  const weeklyDigest = new WeeklyDigestWorker(bundle, logger);
  cron.register({ pattern: '0 13 * * 1' }, weeklyDigest.run.bind(weeklyDigest));

  const expiryReminder = new FitProfileExpiryReminderWorker(bundle, queue, logger);
  queue.register<FitProfileExpiryReminderJobData>(
    FIT_PROFILE_EXPIRY_REMINDER_QUEUE,
    expiryReminder.process.bind(expiryReminder),
  );
  // Daily 09:00 America/Sao_Paulo schedule fan-out tick — enqueued
  // through the queue's repeat semantics so we don't double-tick when
  // multiple instances boot.
  void queue.schedule<FitProfileExpiryReminderJobData>(
    FIT_PROFILE_EXPIRY_REMINDER_QUEUE,
    { kind: 'schedule' },
    {
      repeat: { pattern: '0 9 * * *', tz: 'America/Sao_Paulo' },
      jobId: 'fit-profile-expiry-reminder-schedule-cron',
    },
  );
}

/**
 * Extra fields the notifications BC carries on top of the canonical
 * `BoundedContextComposition<NotificationsUseCases>` — the SSE bundle
 * + its `kind: 'sse'` routes. The bootstrap mounts them as a separate
 * group because the SSE handler closes over `SseStreamPort` and is
 * typed against `NotificationsSseBundle`, not `NotificationsUseCases`.
 */
export interface NotificationsCompositionExtras {
  readonly sseBundle: NotificationsSseBundle;
  readonly sseRoutes: typeof notificationsSseRoutes;
}

/**
 * Build the framework-free composition for the notifications BC.
 *
 * The bootstrap is responsible for:
 *  - mounting `routes` (HTTP) against `useCases`,
 *  - mounting `sseRoutes` against `sseBundle`,
 *  - calling `eventBus.on(b.eventType, b.handler)` for each
 *    `eventHandlers` entry,
 *  - calling `queue.register(b.queue, b.process)` for each `workers`
 *    entry,
 *  - awaiting `lifecycles[i].init()` in declaration order at boot
 *    (cron registrations + the BullMQ `queue.schedule` repeat tick).
 */
export function buildNotificationsComposition(
  prisma: PrismaService,
  email: EmailService,
  cache: CachePort,
  logger: LoggerPort,
  sse: SseStreamPort,
  eventBus: EventBusPort,
  queue: JobQueuePort,
  cron: CronPort,
): BoundedContextComposition<NotificationsUseCases> & NotificationsCompositionExtras {
  const useCases = buildNotificationsUseCases(prisma, email, cache, logger, sse);
  const sseBundle = buildNotificationsSseBundle(sse);

  // --- Event handlers (POJO `@OnEvent` replacements) ---
  const fitProfileExpired = new FitProfileExpiredNotificationHandler(useCases, logger);
  const qualityRank = new ResumeQualityRankNotificationHandler(useCases, logger);

  const eventHandlers: ReadonlyArray<BcEventBinding> = [
    {
      eventType: UserFitProfileUpdatedEvent.TYPE,
      handler: fitProfileExpired.handle.bind(fitProfileExpired),
    },
    {
      eventType: ResumeQualityComputedEvent.TYPE,
      handler: qualityRank.handle.bind(qualityRank),
    },
  ];

  // --- Workers (BullMQ-shaped queue processors) ---
  const expiryReminder = new FitProfileExpiryReminderWorker(useCases, queue, logger);

  const workers: ReadonlyArray<BcWorkerBinding> = [
    {
      queue: FIT_PROFILE_EXPIRY_REMINDER_QUEUE,
      process: expiryReminder.process.bind(expiryReminder) as BcWorkerBinding['process'],
    },
  ];

  // --- Cron + repeat-job lifecycle (digests + fan-out tick) ---
  const dailyDigest = new NotificationDigestWorker(useCases, logger);
  const weeklyDigest = new WeeklyDigestWorker(useCases, logger);

  const lifecycles: ReadonlyArray<Lifecycle> = [
    {
      init: async (): Promise<void> => {
        cron.register({ pattern: '0 8 * * *' }, dailyDigest.run.bind(dailyDigest));
        cron.register({ pattern: '0 13 * * 1' }, weeklyDigest.run.bind(weeklyDigest));
        await queue.schedule<FitProfileExpiryReminderJobData>(
          FIT_PROFILE_EXPIRY_REMINDER_QUEUE,
          { kind: 'schedule' },
          {
            repeat: { pattern: '0 9 * * *', tz: 'America/Sao_Paulo' },
            jobId: 'fit-profile-expiry-reminder-schedule-cron',
          },
        );
      },
    },
  ];

  // `eventBus` is part of the canonical signature but the bootstrap is
  // the one that calls `eventBus.on(...)` from the returned
  // `eventHandlers` bindings — keep the param so cross-BC composition
  // call sites stay symmetric.
  void eventBus;

  return {
    useCases,
    routes: notificationsRoutes,
    eventHandlers,
    workers,
    lifecycles,
    sseBundle,
    sseRoutes: notificationsSseRoutes,
  };
}
