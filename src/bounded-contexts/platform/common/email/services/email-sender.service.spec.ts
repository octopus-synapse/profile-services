/**
 * EmailSenderService — strict-throw coverage.
 *
 * The lenient `sendEmail` no-ops when SMTP is unconfigured, but
 * transactional callers (password reset, invoices) need typed
 * surfacing. `sendEmailStrict` throws `ConfigurationMissingException`
 * when env is missing and `FeatureDisabledException` when the
 * transporter was disabled post-init.
 */

import { describe, expect, it, mock } from 'bun:test';
import type { ConfigPort } from '@/shared-kernel/config';
import type { LoggerPort } from '@/shared-kernel/logger';
import {
  ConfigurationMissingException,
  FeatureDisabledException,
} from '../../exceptions/platform.exceptions';
import { EmailSenderService } from './email-sender.service';

const buildLogger = (): LoggerPort =>
  ({
    log: mock(),
    debug: mock(),
    warn: mock(),
    error: mock(),
    setContext: mock(),
  }) as unknown as LoggerPort;

const buildConfig = (overrides: Record<string, unknown> = {}): ConfigPort =>
  ({
    get: mock(<T = string>(key: string) => overrides[key] as T | undefined),
    getOrDefault: mock(<T>(key: string, d: T) => (overrides[key] as T) ?? d),
  }) as unknown as ConfigPort;

describe('EmailSenderService — strict throws', () => {
  it('throws ConfigurationMissingException when SMTP_HOST is unset', async () => {
    const service = new EmailSenderService(buildConfig(), buildLogger());

    await expect(
      service.sendEmailStrict({ to: 'a@b.com', subject: 's', html: '<p>x</p>' }),
    ).rejects.toThrow(ConfigurationMissingException);
  });

  it('throws FeatureDisabledException when transporter is null but host is set', async () => {
    const service = new EmailSenderService(
      buildConfig({ SMTP_HOST: 'smtp.example.com' }),
      buildLogger(),
    );
    // Simulate operator disabling after init by force-clearing transporter
    (service as unknown as { transporter: unknown }).transporter = null;

    await expect(
      service.sendEmailStrict({ to: 'a@b.com', subject: 's', html: '<p>x</p>' }),
    ).rejects.toThrow(FeatureDisabledException);
  });
});
