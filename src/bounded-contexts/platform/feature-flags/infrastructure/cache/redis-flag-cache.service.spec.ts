import { describe, expect, it } from 'bun:test';
import type { RedisConnectionService } from '@/bounded-contexts/platform/common/cache/redis-connection.service';
import type { LoggerPort } from '@/shared-kernel/logger/logger.port';
import { RedisFlagCache } from './redis-flag-cache.service';

interface FakeRedis {
  scanCalls: number;
  unlinked: string[];
  keysCalled: boolean;
  publishedChannel: string | null;
  publishedMessage: string | null;
}

function buildFakeClient(pages: string[][]): {
  client: unknown;
  state: FakeRedis;
} {
  const state: FakeRedis = {
    scanCalls: 0,
    unlinked: [],
    keysCalled: false,
    publishedChannel: null,
    publishedMessage: null,
  };

  const client = {
    keys: () => {
      state.keysCalled = true;
      return Promise.resolve([]);
    },
    scanStream: () => {
      state.scanCalls += 1;
      const iter = (async function* () {
        for (const page of pages) yield page;
      })();
      return iter;
    },
    unlink: (...keys: string[]) => {
      state.unlinked.push(...keys);
      return Promise.resolve(keys.length);
    },
    publish: (channel: string, message: string) => {
      state.publishedChannel = channel;
      state.publishedMessage = message;
      return Promise.resolve(1);
    },
  };

  return { client, state };
}

function buildLogger(): LoggerPort {
  return {
    log: () => {},
    error: () => {},
    warn: () => {},
    debug: () => {},
    verbose: () => {},
  } as unknown as LoggerPort;
}

describe('RedisFlagCache.invalidateAll (P1 #40)', () => {
  it('walks the keyspace via SCAN+UNLINK without ever calling KEYS', async () => {
    const pages: string[][] = [
      ['flags:snapshot:a', 'flags:snapshot:b'],
      ['flags:snapshot:c'],
      [],
      ['flags:snapshot:d'],
    ];
    const { client, state } = buildFakeClient(pages);
    const connection = { isEnabled: true, client } as unknown as RedisConnectionService;

    const cache = new RedisFlagCache(connection, buildLogger());
    await cache.invalidateAll('feature.x' as never);

    expect(state.keysCalled).toBe(false);
    expect(state.scanCalls).toBe(1);
    expect(state.unlinked.sort()).toEqual([
      'flags:snapshot:a',
      'flags:snapshot:b',
      'flags:snapshot:c',
      'flags:snapshot:d',
    ]);
    expect(state.publishedChannel).toBe('flags:invalidate');
    expect(state.publishedMessage).toBe('feature.x');
  });

  it('still publishes the wildcard when no snapshots exist', async () => {
    const { client, state } = buildFakeClient([[]]);
    const connection = { isEnabled: true, client } as unknown as RedisConnectionService;

    const cache = new RedisFlagCache(connection, buildLogger());
    await cache.invalidateAll();

    expect(state.unlinked).toEqual([]);
    expect(state.publishedMessage).toBe('*');
  });
});
