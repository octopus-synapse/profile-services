/**
 * Test Email Log Factory
 *
 * Creates test email log data with sensible defaults.
 */

import type { EmailStatus } from '@prisma/client';

export function createTestEmailLog(overrides?: {
  id?: string;
  userId?: string | null;
  to?: string;
  subject?: string;
  template?: string;
  status?: EmailStatus;
  sentAt?: Date | null;
  failedAt?: Date | null;
  error?: string | null;
  metadata?: unknown;
  createdAt?: Date;
}): {
  id: string;
  userId: string | null;
  to: string;
  subject: string;
  template: string;
  status: EmailStatus;
  sentAt: Date | null;
  failedAt: Date | null;
  error: string | null;
  metadata: unknown;
  createdAt: Date;
} {
  return {
    id: overrides?.id ?? 'email-log-1',
    userId: overrides?.userId ?? null,
    to: overrides?.to ?? 'test@example.com',
    subject: overrides?.subject ?? 'Test Email',
    template: overrides?.template ?? 'welcome',
    status: overrides?.status ?? ('PENDING' as EmailStatus),
    sentAt: overrides?.sentAt ?? null,
    failedAt: overrides?.failedAt ?? null,
    error: overrides?.error ?? null,
    metadata: overrides?.metadata ?? null,
    createdAt: overrides?.createdAt ?? new Date(),
  };
}
