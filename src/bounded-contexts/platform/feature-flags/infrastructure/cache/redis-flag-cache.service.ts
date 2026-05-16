import { createHash } from 'node:crypto';
import Redis from 'ioredis';
import { RedisConnectionService } from '@/bounded-contexts/platform/common/cache/redis-connection.service';
import type { ConfigPort } from '@/shared-kernel/config';
import type { Lifecycle } from '@/shared-kernel/lifecycle';
import { LoggerPort } from '@/shared-kernel/logger/logger.port';
import type { FlagCachePort } from '../../application/ports/flag-cache.port';
import type { FeatureFlagKey, FlagEvaluationSnapshot } from '../../domain/types';

const SNAPSHOT_PREFIX = 'flags:snapshot:';
const INVALIDATE_CHANNEL = 'flags:invalidate';
const TTL_SECONDS = 60;
const REDIS_DEFAULT_PORT = 6379;
const RETRY_DELAY_MAX = 2000;
const RETRY_DELAY_MULTIPLIER = 50;

/**
 * Caches per-roles-fingerprint evaluation snapshots in Redis with a dedicated
 * subscriber connection for cross-instance invalidation. Falls back to a
 * no-op when Redis isn't configured so the app still boots in dev.
 */

export class RedisFlagCache implements Lifecycle, FlagCachePort {
  private subscriber: Redis | null = null;
  private readonly localListeners = new Set<() => void>();

  // P1-031 — `config` is optional so legacy callers keep working;
  // the bootstrap supplies the canonical port so we stop reading
  // `process.env.REDIS_*` directly.
  constructor(
    private readonly connection: RedisConnectionService,
    private readonly logger: LoggerPort,
    private readonly config?: ConfigPort,
  ) {}

  async init(): Promise<void> {
    if (!this.connection.isEnabled) return;

    const host = this.config?.get<string>('REDIS_HOST') ?? process.env.REDIS_HOST;
    if (!host) return;

    const portRaw =
      this.config?.get<string>('REDIS_PORT') ??
      process.env.REDIS_PORT ??
      String(REDIS_DEFAULT_PORT);
    const password = this.config?.get<string>('REDIS_PASSWORD') ?? process.env.REDIS_PASSWORD;

    try {
      this.subscriber = new Redis({
        host,
        port: parseInt(portRaw, 10),
        password,
        // Match RedisConnectionService: cap retry delay so a misconfigured
        // host doesn't produce unbounded error spam or crash loops.
        retryStrategy: (times) => Math.min(times * RETRY_DELAY_MULTIPLIER, RETRY_DELAY_MAX),
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });
    } catch (err) {
      this.logger.warn(
        'Failed to construct flag cache subscriber — running without cross-instance invalidation',
        'RedisFlagCache',
        {
          error: err instanceof Error ? err.message : String(err),
        },
      );
      this.subscriber = null;
      return;
    }

    this.subscriber.on('error', (err) => {
      this.logger.warn('Flag cache subscriber error — ignored, will retry', 'RedisFlagCache', {
        error: err.message,
      });
    });

    try {
      await this.subscriber.connect();
      await this.subscriber.subscribe(INVALIDATE_CHANNEL);
      this.subscriber.on('message', (channel) => {
        if (channel !== INVALIDATE_CHANNEL) return;
        for (const fn of this.localListeners) fn();
      });
    } catch (err) {
      this.logger.warn(
        'Flag cache subscriber connect failed — continuing without pub/sub',
        'RedisFlagCache',
        {
          error: err instanceof Error ? err.message : String(err),
        },
      );
      try {
        await this.subscriber.quit();
      } catch {
        // ignore
      }
      this.subscriber = null;
    }
  }

  async dispose(): Promise<void> {
    if (process.env.NODE_ENV === 'test') return;
    if (this.subscriber) {
      try {
        await this.subscriber.quit();
      } catch {
        // shutdown race — ignore
      }
      this.subscriber = null;
    }
  }

  /**
   * Fingerprint identical role sets to the same cache key so users that
   * share role membership also share snapshots.
   */
  fingerprintRoles(roles: readonly string[]): string {
    const sorted = [...roles].sort();
    return createHash('sha1').update(sorted.join('|')).digest('hex').slice(0, 16);
  }

  async getSnapshot(fingerprint: string): Promise<FlagEvaluationSnapshot | null> {
    const client = this.connection.client;
    if (!client) return null;
    try {
      const raw = await client.get(`${SNAPSHOT_PREFIX}${fingerprint}`);
      return raw ? (JSON.parse(raw) as FlagEvaluationSnapshot) : null;
    } catch (err) {
      this.logger.warn('Flag snapshot read failed', 'RedisFlagCache', {
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  async setSnapshot(fingerprint: string, snapshot: FlagEvaluationSnapshot): Promise<void> {
    const client = this.connection.client;
    if (!client) return;
    try {
      await client.set(
        `${SNAPSHOT_PREFIX}${fingerprint}`,
        JSON.stringify(snapshot),
        'EX',
        TTL_SECONDS,
      );
    } catch (err) {
      this.logger.warn('Flag snapshot write failed', 'RedisFlagCache', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async invalidateAll(changedKey?: FeatureFlagKey): Promise<void> {
    const client = this.connection.client;
    if (!client) {
      for (const fn of this.localListeners) fn();
      return;
    }
    try {
      // P0-#13: replace `KEYS pattern` (blocks Redis on the entire keyspace,
      // O(N)) with `SCAN + UNLINK` so feature-flag toggles can't freeze
      // every other client during a rollout sweep.
      const stream = client.scanStream({ match: `${SNAPSHOT_PREFIX}*`, count: 200 });
      let pending: Promise<unknown>[] = [];
      for await (const keys of stream as AsyncIterable<string[]>) {
        if (keys.length === 0) continue;
        pending.push(client.unlink(...keys));
        if (pending.length >= 10) {
          await Promise.all(pending);
          pending = [];
        }
      }
      if (pending.length > 0) await Promise.all(pending);
      await client.publish(INVALIDATE_CHANNEL, changedKey ?? '*');
    } catch (err) {
      this.logger.warn('Flag cache invalidation failed', 'RedisFlagCache', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  onInvalidate(fn: () => void): () => void {
    this.localListeners.add(fn);
    return () => this.localListeners.delete(fn);
  }
}
