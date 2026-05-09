import { describe, expect, it } from 'bun:test';
import type { EmailService } from '@/bounded-contexts/platform/common/email/email.service';
import { NotificationDeliveryFailedException } from '../../../domain/exceptions/notifications.exceptions';
import { PlatformEmailAdapter } from './platform-email.adapter';

describe('PlatformEmailAdapter', () => {
  it('wraps underlying SMTP failures in NotificationDeliveryFailedException', async () => {
    const email = {
      sendEmail: async () => {
        throw new Error('connect ECONNREFUSED 127.0.0.1:587');
      },
    } as unknown as EmailService;
    const adapter = new PlatformEmailAdapter(email);

    await expect(
      adapter.send({ to: 'a@b.com', subject: 's', html: '<p>x</p>', text: 'x' }),
    ).rejects.toBeInstanceOf(NotificationDeliveryFailedException);
  });

  it('returns void on successful delivery', async () => {
    const email = { sendEmail: async () => undefined } as unknown as EmailService;
    const adapter = new PlatformEmailAdapter(email);
    await expect(
      adapter.send({ to: 'a@b.com', subject: 's', html: '<p>x</p>', text: 'x' }),
    ).resolves.toBeUndefined();
  });
});
