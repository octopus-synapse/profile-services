/**
 * Adapter for `NotificationEmailPort` that delegates to the platform
 * `EmailService`. Keeps the SMTP / template plumbing inside the
 * platform module so this BC only deals in the simplified `send`
 * shape.
 *
 * Any underlying SMTP / provider error is wrapped as a
 * `NotificationDeliveryFailedException` so callers (workers, the
 * fire-and-forget instant-email path) can branch on a domain type
 * instead of inspecting nodemailer / SDK error shapes.
 */

import { EmailService } from '@/bounded-contexts/platform/common/email/email.service';
import { NotificationDeliveryFailedException } from '../../../domain/exceptions/notifications.exceptions';
import {
  type NotificationEmailMessage,
  NotificationEmailPort,
} from '../../../domain/ports/notification-email.port';

const CHANNEL = 'email';

export class PlatformEmailAdapter extends NotificationEmailPort {
  constructor(private readonly email: EmailService) {
    super();
  }

  async send(message: NotificationEmailMessage): Promise<void> {
    try {
      await this.email.sendEmail({
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
    } catch {
      throw new NotificationDeliveryFailedException(CHANNEL);
    }
  }
}
