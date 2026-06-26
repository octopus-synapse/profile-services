/**
 * Bundle token for the notifications BC. Doubles as the TypeScript
 * shape and the Nest DI token. Wiring lives in
 * `notifications.composition.ts` — Nest-free.
 */

import type { CreateNotificationUseCase } from '../use-cases/create-notification/create-notification.use-case';
import type { DeleteOldNotificationsUseCase } from '../use-cases/delete-old-notifications/delete-old-notifications.use-case';
import type { EnqueueExpiryRemindersUseCase } from '../use-cases/enqueue-expiry-reminders/enqueue-expiry-reminders.use-case';
import type { GetPreferencesUseCase } from '../use-cases/get-preferences/get-preferences.use-case';
import type { GetUnreadCountUseCase } from '../use-cases/get-unread-count/get-unread-count.use-case';
import type { ListNotificationsUseCase } from '../use-cases/list-notifications/list-notifications.use-case';
import type { MarkNotificationsReadUseCase } from '../use-cases/mark-notifications-read/mark-notifications-read.use-case';
import type { NotifyFitProfileExpiredUseCase } from '../use-cases/notify-fit-profile-expired/notify-fit-profile-expired.use-case';
import type { NotifyResumeQualityRankChangeUseCase } from '../use-cases/notify-resume-quality-rank-change/notify-resume-quality-rank-change.use-case';
import type { RegisterPushDeviceUseCase } from '../use-cases/register-push-device/register-push-device.use-case';
import type { SendDailyDigestsUseCase } from '../use-cases/send-daily-digests/send-daily-digests.use-case';
import type { SendExpiryReminderUseCase } from '../use-cases/send-expiry-reminder/send-expiry-reminder.use-case';
import type { SendWeeklyDigestsUseCase } from '../use-cases/send-weekly-digests/send-weekly-digests.use-case';
import type { SetPreferenceUseCase } from '../use-cases/set-preference/set-preference.use-case';
import type { UnregisterPushDeviceUseCase } from '../use-cases/unregister-push-device/unregister-push-device.use-case';

export abstract class NotificationsUseCases {
  abstract readonly createNotification: CreateNotificationUseCase;
  abstract readonly listNotifications: ListNotificationsUseCase;
  abstract readonly getUnreadCount: GetUnreadCountUseCase;
  abstract readonly markNotificationsRead: MarkNotificationsReadUseCase;
  abstract readonly getPreferences: GetPreferencesUseCase;
  abstract readonly setPreference: SetPreferenceUseCase;
  abstract readonly registerPushDevice: RegisterPushDeviceUseCase;
  abstract readonly unregisterPushDevice: UnregisterPushDeviceUseCase;
  abstract readonly deleteOldNotifications: DeleteOldNotificationsUseCase;
  abstract readonly sendDailyDigests: SendDailyDigestsUseCase;
  abstract readonly sendWeeklyDigests: SendWeeklyDigestsUseCase;
  abstract readonly notifyFitProfileExpired: NotifyFitProfileExpiredUseCase;
  abstract readonly notifyResumeQualityRankChange: NotifyResumeQualityRankChangeUseCase;
  abstract readonly enqueueExpiryReminders: EnqueueExpiryRemindersUseCase;
  abstract readonly sendExpiryReminder: SendExpiryReminderUseCase;
}
