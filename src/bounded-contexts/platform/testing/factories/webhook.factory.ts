/**
 * Test Webhook Factory
 *
 * Creates test webhook data with sensible defaults.
 */
export function createTestWebhook(overrides?: {
  id?: string;
  userId?: string;
  url?: string;
  secret?: string;
  events?: string[];
  enabled?: boolean;
}): {
  id: string;
  userId: string;
  url: string;
  secret: string;
  events: string[];
  enabled: boolean;
} {
  return {
    id: overrides?.id ?? 'webhook-1',
    userId: overrides?.userId ?? 'user-123',
    url: overrides?.url ?? 'https://example.com/webhook',
    secret: overrides?.secret ?? 'secret-key',
    events: overrides?.events ?? ['resume.created', 'resume.published'],
    enabled: overrides?.enabled ?? true,
  };
}
