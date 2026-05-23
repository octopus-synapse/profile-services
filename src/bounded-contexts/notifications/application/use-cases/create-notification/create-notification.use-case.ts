/**
 * Creates an in-app notification, emits it on the SSE bus, and (when
 * the user's preferences allow) fires a one-shot instant email
 * fire-and-forget.
 *
 * Self-notifications are a no-op (`userId === actorId`). Disabled
 * preferences short-circuit before the row is written. Email failures
 * never propagate — the in-app row is the source of truth and SMTP
 * blips must never block the caller.
 */

import {
  LOCALES,
  type Locale,
  NOTIFICATION_DICTIONARY,
  type NotificationCode,
  renderNotification,
} from '@packages/i18n';
import type { LoggerPort } from '@/shared-kernel';
import type {
  NotificationStreamEvent,
  NotificationType,
  NotificationView,
} from '../../../domain/entities/notification.entity';
import { UnknownNotificationTypeException } from '../../../domain/exceptions/notifications.exceptions';
import type { NotificationEmailPort } from '../../../domain/ports/notification-email.port';
import type { NotificationStreamPort } from '../../../domain/ports/notification-stream.port';
import type { NotificationsRepositoryPort } from '../../../domain/ports/notifications.repository.port';
import { escapeHtml, humanizeType } from '../../shared/format';

const CTX = 'CreateNotificationUseCase';

/**
 * Mirrors the Prisma `NotificationType` enum (see
 * `prisma/schema/enums.prisma`). Kept here as a runtime set so callers
 * passing untyped strings (worker payloads, BullMQ job data, fire-and-
 * forget bus emitters) get rejected at the use-case boundary instead
 * of failing with a Prisma constraint error deeper down.
 */
const KNOWN_NOTIFICATION_TYPES: ReadonlySet<NotificationType> = new Set([
  'POST_LIKED',
  'POST_COMMENTED',
  'POST_REPOSTED',
  'POST_BOOKMARKED',
  'COMMENT_REPLIED',
  'CONNECTION_REQUEST',
  'CONNECTION_ACCEPTED',
  'FOLLOW_NEW',
  'SKILL_DECAY',
  'APPLICATION_STALE',
  'CONNECTION_RECOMMENDATION',
  'FIT_PROFILE_EXPIRED',
  'FIT_PROFILE_EXPIRY_REMINDER',
  'MATCH_RECOMMENDATIONS_READY',
  'RESUME_QUALITY_IMPROVED',
  'RESUME_QUALITY_REGRESSED',
] satisfies NotificationType[]);

export interface CreateNotificationInput {
  readonly userId: string;
  readonly type: NotificationType;
  readonly actorId: string;
  /**
   * Fallback literal — used as-is when `messageKey`/`messageParams`
   * are absent (legacy callers) or as the persisted fallback for old
   * clients reading the `message` column. New callers SHOULD set
   * `messageKey` + `messageParams` so the notification is locale-aware
   * (P1 #23) and re-renderable in any user-preferred language.
   */
  readonly message?: string;
  readonly entityType?: string;
  readonly entityId?: string;
  /** i18n template code matching a `NOTIFICATION_DICTIONARY` entry. */
  readonly messageKey?: NotificationCode;
  /** Named params for the template (must include all `dict.params`). */
  readonly messageParams?: Readonly<Record<string, string | number>>;
}

function isSupportedLocale(value: string): value is Locale {
  return (LOCALES as ReadonlyArray<string>).includes(value);
}

export class CreateNotificationUseCase {
  constructor(
    private readonly repository: NotificationsRepositoryPort,
    private readonly stream: NotificationStreamPort,
    private readonly email: NotificationEmailPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(input: CreateNotificationInput): Promise<NotificationView | null> {
    if (!KNOWN_NOTIFICATION_TYPES.has(input.type)) {
      throw new UnknownNotificationTypeException(String(input.type));
    }

    if (input.userId === input.actorId) {
      return null;
    }

    // Respect user preferences — if explicitly disabled for this type, skip.
    const pref = await this.repository.findUserPreference(input.userId, input.type);
    if (pref && !pref.enabled) {
      return null;
    }

    // P1 #23 — render notification body via the i18n dictionary in the
    // recipient's preferred locale when caller provides messageKey.
    // Falls back to the literal `message` for legacy callers.
    const recipient = await this.repository.findRecipient(input.userId);
    const locale: Locale =
      recipient && isSupportedLocale(recipient.language) ? recipient.language : 'en';

    let renderedMessage = input.message ?? '';
    if (input.messageKey && input.messageKey in NOTIFICATION_DICTIONARY) {
      renderedMessage = renderNotification(
        input.messageKey,
        input.messageParams ?? {},
        locale,
        'body',
      );
    }

    const notification = await this.repository.create({
      userId: input.userId,
      type: input.type,
      actorId: input.actorId,
      message: renderedMessage,
      entityType: input.entityType,
      entityId: input.entityId,
      messageKey: input.messageKey,
      messageParams: input.messageParams,
    });

    const streamEvent: NotificationStreamEvent = {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      message: notification.message,
      actorId: notification.actorId,
      entityType: notification.entityType,
      entityId: notification.entityId,
      createdAt: notification.createdAt,
    };
    this.stream.emit(input.userId, streamEvent);

    // Fire-and-forget email delivery; never block notification creation on SMTP.
    void this.maybeSendInstantEmail(input.userId, input.type, notification.id, renderedMessage);

    return notification;
  }

  private async maybeSendInstantEmail(
    userId: string,
    type: NotificationType,
    notificationId: string,
    message: string,
  ): Promise<void> {
    try {
      const pref = await this.repository.findUserPreference(userId, type);
      // Default: INSTANT + emailEnabled=true, unless user overrode to OFF/DAILY.
      const mode = pref?.emailDelivery ?? 'INSTANT';
      if (mode !== 'INSTANT' || pref?.emailEnabled === false) return;

      const recipient = await this.repository.findRecipient(userId);
      if (!recipient?.email) return;

      await this.email.send({
        to: recipient.email,
        subject: `[ProFile] ${humanizeType(type)}`,
        // P0-#10: escape recipient.name (attacker-controlled display name).
        html: `<p>Hi ${escapeHtml(recipient.name ?? 'there')},</p><p>${escapeHtml(message)}</p>`,
        text: message,
      });

      await this.repository.markEmailSentAt(notificationId, new Date());
    } catch (err) {
      this.logger.warn(
        `Notification email failed for user ${userId}: ${err instanceof Error ? err.message : 'unknown'}`,
        CTX,
      );
    }
  }
}
