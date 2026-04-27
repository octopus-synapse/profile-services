/**
 * Adapter for `NotificationEmailPort` that delegates to the platform
 * `EmailService`. Keeps the SMTP / template plumbing inside the
 * platform module so this BC only deals in the simplified `send`
 * shape.
 */

import { EmailService } from '@/bounded-contexts/platform/common/email/email.service';
import {
  type NotificationEmailMessage,
  NotificationEmailPort,
} from '../../../domain/ports/notification-email.port';

export class PlatformEmailAdapter extends NotificationEmailPort {
  constructor(private readonly email: EmailService) {
    super();
  }

  async send(message: NotificationEmailMessage): Promise<void> {
    await this.email.sendEmail({
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  }
}
