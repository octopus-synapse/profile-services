/**
 * In-Memory Webhook Repository
 *
 * Stores webhook configurations for testing webhook delivery.
 */
export class InMemoryWebhookRepository {
  private webhooks: Array<{
    id: string;
    userId: string;
    url: string;
    secret: string;
    events: string[];
    enabled: boolean;
  }> = [];

  async findMany(options?: {
    where?: { userId?: string; enabled?: boolean };
  }): Promise<typeof this.webhooks> {
    let results = [...this.webhooks];

    if (options?.where?.userId) {
      results = results.filter((w) => w.userId === options.where?.userId);
    }

    if (options?.where?.enabled !== undefined) {
      results = results.filter((w) => w.enabled === options.where?.enabled);
    }

    return results;
  }

  async findUnique(options: { where: { id: string } }): Promise<(typeof this.webhooks)[0] | null> {
    return this.webhooks.find((w) => w.id === options.where.id) ?? null;
  }

  async create(data: {
    userId: string;
    url: string;
    secret: string;
    events: string[];
    enabled?: boolean;
  }): Promise<(typeof this.webhooks)[0]> {
    const webhook = {
      id: `webhook-${this.webhooks.length + 1}`,
      userId: data.userId,
      url: data.url,
      secret: data.secret,
      events: data.events,
      enabled: data.enabled ?? true,
    };
    this.webhooks.push(webhook);
    return webhook;
  }

  async update(options: {
    where: { id: string };
    data: Partial<{ url: string; secret: string; events: string[]; enabled: boolean }>;
  }): Promise<(typeof this.webhooks)[0] | null> {
    const index = this.webhooks.findIndex((w) => w.id === options.where.id);
    if (index === -1) return null;

    this.webhooks[index] = { ...this.webhooks[index], ...options.data };
    return this.webhooks[index];
  }

  async delete(options: { where: { id: string } }): Promise<(typeof this.webhooks)[0] | null> {
    const index = this.webhooks.findIndex((w) => w.id === options.where.id);
    if (index === -1) return null;

    const [deleted] = this.webhooks.splice(index, 1);
    return deleted;
  }

  // Test helpers
  seed(webhook: {
    id?: string;
    userId: string;
    url: string;
    secret: string;
    events: string[];
    enabled?: boolean;
  }): void {
    this.webhooks.push({
      id: webhook.id ?? `webhook-${this.webhooks.length + 1}`,
      userId: webhook.userId,
      url: webhook.url,
      secret: webhook.secret,
      events: webhook.events,
      enabled: webhook.enabled ?? true,
    });
  }

  clear(): void {
    this.webhooks = [];
  }

  getAll(): typeof this.webhooks {
    return [...this.webhooks];
  }
}
