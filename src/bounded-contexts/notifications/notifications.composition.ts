/**
 * Pure-TS wiring for the notifications BC. Zero `@nestjs/*` imports.
 *
 * The composition takes the framework primitives that adapters need
 * — Prisma, the platform email service, the in-process cache, and
 * Nest's `EventEmitter2` (typed loosely as a `NotificationStreamPort`
 * shape on the calling side) — and returns the use-case bundle the
 * controllers, workers, and handlers all consume.
 *
 * `EventEmitter2` is taken as a parameter rather than imported from
 * `@nestjs/event-emitter` so this file stays framework-free; the Nest
 * shell hands it in. When the SSE stream moves behind an
 * `EventBusPort` we'll drop this parameter entirely.
 */

import type { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import type { EmailService } from '@/bounded-contexts/platform/common/email/email.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
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
import type { NotificationStreamPort } from './domain/ports/notification-stream.port';
import { CacheReminderStateAdapter } from './infrastructure/adapters/external-services/cache-reminder-state.adapter';
import { PlatformEmailAdapter } from './infrastructure/adapters/external-services/platform-email.adapter';
import { PrismaFitProfileExpiryAdapter } from './infrastructure/adapters/persistence/prisma-fit-profile-expiry.adapter';
import { PrismaNotificationsRepository } from './infrastructure/adapters/persistence/prisma-notifications.repository';
import { PrismaResumeQualitySnapshotAdapter } from './infrastructure/adapters/persistence/prisma-resume-quality-snapshot.adapter';
import { PrismaWeeklyDigestLogAdapter } from './infrastructure/adapters/persistence/prisma-weekly-digest-log.adapter';
import { PrismaWeeklyDigestStatsAdapter } from './infrastructure/adapters/persistence/prisma-weekly-digest-stats.adapter';

export { NotificationsUseCases };

export function buildNotificationsUseCases(
  prisma: PrismaService,
  email: EmailService,
  cache: CacheService,
  stream: NotificationStreamPort,
  logger: LoggerPort,
): NotificationsUseCases {
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
