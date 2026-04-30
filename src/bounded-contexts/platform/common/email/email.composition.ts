/**
 * Pure-TS factory for the leaf platform email services. Zero
 * `@nestjs/*` imports — both the Nest module shell (`email.module.ts`)
 * and the Elysia bootstrap consume `buildEmailComposition`.
 *
 * This is a SERVICE composition, not a full BC composition: there are
 * no routes/use-cases to ship. Returns the constructed POJOs so the
 * Nest shell can re-bind them to its DI graph via `useFactory` and the
 * Elysia bootstrap can pass them straight into BC compositions that
 * declare an `EmailService` dep (automation, jobs, notifications, …).
 */

import type { ConfigPort } from '@/shared-kernel/config';
import type { LoggerPort } from '@/shared-kernel/logger';
import { EmailService } from './email.service';
import { EmailSenderService } from './services/email-sender.service';
import { EmailTemplateService } from './services/email-template.service';

export { EmailSenderService, EmailService, EmailTemplateService };

export interface EmailComposition {
  readonly emailService: EmailService;
  readonly emailSenderService: EmailSenderService;
  readonly emailTemplateService: EmailTemplateService;
}

export function buildEmailComposition(config: ConfigPort, logger: LoggerPort): EmailComposition {
  const emailSenderService = new EmailSenderService(config, logger);
  const emailTemplateService = new EmailTemplateService(emailSenderService, config);
  const emailService = new EmailService(emailSenderService, emailTemplateService);

  return { emailService, emailSenderService, emailTemplateService };
}
