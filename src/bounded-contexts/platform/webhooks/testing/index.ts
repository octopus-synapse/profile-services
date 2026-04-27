/**
 * In-memory test doubles for the webhook ports.
 *
 * `InMemoryWebhookConfigRepository` keeps configs and delivery rows in
 * a Map; ownership rules match the production adapter (cross-user
 * reads/writes return null/false). `InMemoryWebhookDelivery` records
 * every request and lets a test pin the next outcome.
 */

import type {
  DeliveryOutcome,
  WebhookDeliveryView,
  WebhookEvent,
  WebhookView,
} from '../domain/entities/webhook';
import {
  type CreateWebhookInput,
  type DeliveryTarget,
  type UpdateWebhookInput,
  WebhookConfigRepositoryPort,
} from '../domain/ports/webhook-config.repository.port';
import {
  type DeliveryRequest,
  WebhookDeliveryPort,
} from '../domain/ports/webhook-delivery.port';

interface ConfigRow {
  readonly id: string;
  readonly userId: string;
  url: string;
  events: WebhookEvent[];
  enabled: boolean;
  secret: string;
  readonly createdAt: Date;
  updatedAt?: Date;
}

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${++counter}`;

export class InMemoryWebhookConfigRepository extends WebhookConfigRepositoryPort {
  readonly configs = new Map<string, ConfigRow>();
  readonly deliveries: Array<{
    webhookId: string;
    eventType: string;
    payload: unknown;
    outcome: DeliveryOutcome;
  }> = [];

  seedConfig(row: Partial<ConfigRow> & { userId: string; events: WebhookEvent[] }): ConfigRow {
    const full: ConfigRow = {
      id: row.id ?? nextId('wh'),
      userId: row.userId,
      url: row.url ?? `https://example.com/${row.id ?? 'hook'}`,
      events: row.events,
      enabled: row.enabled ?? true,
      secret: row.secret ?? 'seed-secret',
      createdAt: row.createdAt ?? new Date(),
      updatedAt: row.updatedAt,
    };
    this.configs.set(full.id, full);
    return full;
  }

  async listForUser(userId: string): Promise<WebhookView[]> {
    return [...this.configs.values()]
      .filter((c) => c.userId === userId)
      .map(toView);
  }

  async createForUser(
    userId: string,
    input: CreateWebhookInput,
    secret: string,
  ): Promise<WebhookView> {
    const row: ConfigRow = {
      id: nextId('wh'),
      userId,
      url: input.url,
      events: [...input.events],
      enabled: true,
      secret,
      createdAt: new Date(),
    };
    this.configs.set(row.id, row);
    return toView(row);
  }

  async updateForUser(
    userId: string,
    id: string,
    input: UpdateWebhookInput,
  ): Promise<WebhookView | null> {
    const row = this.configs.get(id);
    if (!row || row.userId !== userId) return null;
    if (input.url !== undefined) row.url = input.url;
    if (input.events !== undefined) row.events = [...input.events];
    if (input.enabled !== undefined) row.enabled = input.enabled;
    row.updatedAt = new Date();
    return toView(row);
  }

  async deleteForUser(userId: string, id: string): Promise<boolean> {
    const row = this.configs.get(id);
    if (!row || row.userId !== userId) return false;
    this.configs.delete(id);
    return true;
  }

  async listDeliveries(userId: string, webhookId: string): Promise<WebhookDeliveryView[] | null> {
    const row = this.configs.get(webhookId);
    if (!row || row.userId !== userId) return null;
    return this.deliveries
      .filter((d) => d.webhookId === webhookId)
      .map((d, i) => ({
        id: `del-${i}`,
        eventType: d.eventType,
        attempt: d.outcome.attempt,
        success: d.outcome.success,
        statusCode: d.outcome.statusCode,
        errorMessage: d.outcome.errorMessage,
        createdAt: new Date(),
      }));
  }

  async findDeliveryTargets(userId: string, eventType: string): Promise<DeliveryTarget[]> {
    return [...this.configs.values()]
      .filter((c) => c.userId === userId && c.enabled && c.events.includes(eventType as WebhookEvent))
      .map((c) => ({ id: c.id, url: c.url, secret: c.secret }));
  }

  async recordDelivery(
    webhookId: string,
    eventType: string,
    payload: unknown,
    outcome: DeliveryOutcome,
  ): Promise<void> {
    this.deliveries.push({ webhookId, eventType, payload, outcome });
  }
}

function toView(row: ConfigRow): WebhookView {
  return {
    id: row.id,
    url: row.url,
    events: [...row.events],
    enabled: row.enabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class InMemoryWebhookDelivery extends WebhookDeliveryPort {
  readonly calls: DeliveryRequest[] = [];
  private nextOutcome: DeliveryOutcome = {
    attempt: 1,
    success: true,
    statusCode: 200,
    errorMessage: null,
  };

  setNextOutcome(outcome: DeliveryOutcome): void {
    this.nextOutcome = outcome;
  }

  async deliver(request: DeliveryRequest): Promise<DeliveryOutcome> {
    this.calls.push(request);
    return this.nextOutcome;
  }
}
