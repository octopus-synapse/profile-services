/**
 * Notifications Module
 *
 * ADR-001: POJO use cases drive the controllers, the workers, and the
 * event handlers. Persistence goes through `NotificationsRepositoryPort`
 * (Prisma adapter) plus three smaller read-side ports for cross-BC
 * tables (fit-profile expiry, weekly stats, resume-quality history).
 * Email goes through `NotificationEmailPort`, in-process SSE through
 * `NotificationStreamPort`, and the per-window idempotence flag for
 * the expiry-reminder fanout through `ReminderStatePort`.
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
import { LoggerPort } from '@/shared-kernel';
import { BuildWeeklyDigestService } from './application/services/build-weekly-digest.service';
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
import { FitProfileExpiryReadPort } from './domain/ports/fit-profile-expiry.port';
import { NotificationEmailPort } from './domain/ports/notification-email.port';
import { NotificationStreamPort } from './domain/ports/notification-stream.port';
import { NotificationsRepositoryPort } from './domain/ports/notifications.repository.port';
import { ReminderStatePort } from './domain/ports/reminder-state.port';
import { ResumeQualitySnapshotPort } from './domain/ports/resume-quality-snapshot.port';
import { WeeklyDigestLogPort } from './domain/ports/weekly-digest-log.port';
import { WeeklyDigestStatsPort } from './domain/ports/weekly-digest-stats.port';
import { CacheReminderStateAdapter } from './infrastructure/adapters/external-services/cache-reminder-state.adapter';
import { EventEmitterNotificationStreamAdapter } from './infrastructure/adapters/external-services/event-emitter-notification-stream.adapter';
import { PlatformEmailAdapter } from './infrastructure/adapters/external-services/platform-email.adapter';
import { PrismaFitProfileExpiryAdapter } from './infrastructure/adapters/persistence/prisma-fit-profile-expiry.adapter';
import { PrismaNotificationsRepository } from './infrastructure/adapters/persistence/prisma-notifications.repository';
import { PrismaResumeQualitySnapshotAdapter } from './infrastructure/adapters/persistence/prisma-resume-quality-snapshot.adapter';
import { PrismaWeeklyDigestLogAdapter } from './infrastructure/adapters/persistence/prisma-weekly-digest-log.adapter';
import { PrismaWeeklyDigestStatsAdapter } from './infrastructure/adapters/persistence/prisma-weekly-digest-stats.adapter';
import { NotificationController } from './infrastructure/controllers/notification.controller';
import { NotificationsSseController } from './infrastructure/controllers/notifications-sse.controller';
import { FitProfileExpiredNotificationHandler } from './infrastructure/handlers/fit-profile-expired.handler';
import { ResumeQualityRankNotificationHandler } from './infrastructure/handlers/resume-quality-rank.handler';
import {
  FIT_PROFILE_EXPIRY_REMINDER_QUEUE,
  FitProfileExpiryReminderWorker,
} from './infrastructure/workers/fit-profile-expiry-reminder.worker';
import { NotificationDigestWorker } from './infrastructure/workers/notification-digest.worker';
import { WeeklyDigestWorker } from './infrastructure/workers/weekly-digest.worker';

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
    // ───────── ports → adapters ─────────
    {
      provide: NotificationsRepositoryPort,
      useFactory: (prisma: PrismaService) => new PrismaNotificationsRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: WeeklyDigestStatsPort,
      useFactory: (prisma: PrismaService) => new PrismaWeeklyDigestStatsAdapter(prisma),
      inject: [PrismaService],
    },
    {
      provide: WeeklyDigestLogPort,
      useFactory: (prisma: PrismaService) => new PrismaWeeklyDigestLogAdapter(prisma),
      inject: [PrismaService],
    },
    {
      provide: FitProfileExpiryReadPort,
      useFactory: (prisma: PrismaService) => new PrismaFitProfileExpiryAdapter(prisma),
      inject: [PrismaService],
    },
    {
      provide: ResumeQualitySnapshotPort,
      useFactory: (prisma: PrismaService) => new PrismaResumeQualitySnapshotAdapter(prisma),
      inject: [PrismaService],
    },
    {
      provide: NotificationEmailPort,
      useFactory: (email: EmailService) => new PlatformEmailAdapter(email),
      inject: [EmailService],
    },
    {
      provide: NotificationStreamPort,
      useFactory: (emitter: EventEmitter2) => new EventEmitterNotificationStreamAdapter(emitter),
      inject: [EventEmitter2],
    },
    {
      provide: ReminderStatePort,
      useFactory: (cache: CacheService) => new CacheReminderStateAdapter(cache),
      inject: [CacheService],
    },

    // ───────── application services ─────────
    BuildWeeklyDigestService,

    // ───────── use cases ─────────
    {
      provide: CreateNotificationUseCase,
      useFactory: (
        repo: NotificationsRepositoryPort,
        stream: NotificationStreamPort,
        email: NotificationEmailPort,
        logger: LoggerPort,
      ) => new CreateNotificationUseCase(repo, stream, email, logger),
      inject: [
        NotificationsRepositoryPort,
        NotificationStreamPort,
        NotificationEmailPort,
        LoggerPort,
      ],
    },
    {
      provide: ListNotificationsUseCase,
      useFactory: (repo: NotificationsRepositoryPort) => new ListNotificationsUseCase(repo),
      inject: [NotificationsRepositoryPort],
    },
    {
      provide: GetUnreadCountUseCase,
      useFactory: (repo: NotificationsRepositoryPort) => new GetUnreadCountUseCase(repo),
      inject: [NotificationsRepositoryPort],
    },
    {
      provide: MarkNotificationsReadUseCase,
      useFactory: (repo: NotificationsRepositoryPort) => new MarkNotificationsReadUseCase(repo),
      inject: [NotificationsRepositoryPort],
    },
    {
      provide: GetPreferencesUseCase,
      useFactory: (repo: NotificationsRepositoryPort) => new GetPreferencesUseCase(repo),
      inject: [NotificationsRepositoryPort],
    },
    {
      provide: SetPreferenceUseCase,
      useFactory: (repo: NotificationsRepositoryPort) => new SetPreferenceUseCase(repo),
      inject: [NotificationsRepositoryPort],
    },
    {
      provide: DeleteOldNotificationsUseCase,
      useFactory: (repo: NotificationsRepositoryPort) => new DeleteOldNotificationsUseCase(repo),
      inject: [NotificationsRepositoryPort],
    },
    {
      provide: SendDailyDigestsUseCase,
      useFactory: (
        repo: NotificationsRepositoryPort,
        email: NotificationEmailPort,
        logger: LoggerPort,
      ) => new SendDailyDigestsUseCase(repo, email, logger),
      inject: [NotificationsRepositoryPort, NotificationEmailPort, LoggerPort],
    },
    {
      provide: SendWeeklyDigestsUseCase,
      useFactory: (
        repo: NotificationsRepositoryPort,
        stats: WeeklyDigestStatsPort,
        log: WeeklyDigestLogPort,
        email: NotificationEmailPort,
        logger: LoggerPort,
      ) => new SendWeeklyDigestsUseCase(repo, stats, log, email, logger),
      inject: [
        NotificationsRepositoryPort,
        WeeklyDigestStatsPort,
        WeeklyDigestLogPort,
        NotificationEmailPort,
        LoggerPort,
      ],
    },
    {
      provide: NotifyFitProfileExpiredUseCase,
      useFactory: (create: CreateNotificationUseCase, logger: LoggerPort) =>
        new NotifyFitProfileExpiredUseCase(create, logger),
      inject: [CreateNotificationUseCase, LoggerPort],
    },
    {
      provide: NotifyResumeQualityRankChangeUseCase,
      useFactory: (
        snapshots: ResumeQualitySnapshotPort,
        create: CreateNotificationUseCase,
        logger: LoggerPort,
      ) => new NotifyResumeQualityRankChangeUseCase(snapshots, create, logger),
      inject: [ResumeQualitySnapshotPort, CreateNotificationUseCase, LoggerPort],
    },
    {
      provide: EnqueueExpiryRemindersUseCase,
      useFactory: (read: FitProfileExpiryReadPort, state: ReminderStatePort, logger: LoggerPort) =>
        new EnqueueExpiryRemindersUseCase(read, state, logger),
      inject: [FitProfileExpiryReadPort, ReminderStatePort, LoggerPort],
    },
    {
      provide: SendExpiryReminderUseCase,
      useFactory: (
        state: ReminderStatePort,
        create: CreateNotificationUseCase,
        logger: LoggerPort,
      ) => new SendExpiryReminderUseCase(state, create, logger),
      inject: [ReminderStatePort, CreateNotificationUseCase, LoggerPort],
    },

    // ───────── handlers + workers (Nest-decorated infra) ─────────
    FitProfileExpiredNotificationHandler,
    ResumeQualityRankNotificationHandler,
    NotificationDigestWorker,
    WeeklyDigestWorker,
    FitProfileExpiryReminderWorker,
  ],
  exports: [
    CreateNotificationUseCase,
    SendWeeklyDigestsUseCase,
    SendDailyDigestsUseCase,
    NotificationsRepositoryPort,
  ],
})
export class NotificationsModule {}
