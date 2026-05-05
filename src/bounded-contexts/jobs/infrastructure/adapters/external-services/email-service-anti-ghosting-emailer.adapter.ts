/**
 * Adapter for `AntiGhostingEmailerPort` backed by the platform
 * `EmailService` (SMTP via nodemailer). The adapter logs transport
 * failures but does *not* rethrow — the sweep use case treats the
 * email reminder as best-effort and still records the in-app
 * notification + reminder log so the user is nudged in the bell even
 * when SMTP is down.
 */

import { EmailService } from '@/bounded-contexts/platform/common/email/email.service';
import { LoggerPort } from '@/shared-kernel';
import {
  AntiGhostingEmailerPort,
  type AntiGhostingEmailMessage,
} from '../../../domain/ports/anti-ghosting-emailer.port';

const CTX = 'EmailServiceAntiGhostingEmailerAdapter';

export class EmailServiceAntiGhostingEmailerAdapter extends AntiGhostingEmailerPort {
  constructor(
    private readonly email: EmailService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async send(message: AntiGhostingEmailMessage): Promise<void> {
    try {
      await this.email.sendEmail({
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
    } catch (err) {
      this.logger.error(
        `Anti-ghosting email failed for ${message.to}: ${
          err instanceof Error ? err.message : 'unknown'
        }`,
        { context: CTX, stack: err instanceof Error ? err.stack : undefined },
      );
    }
  }
}
