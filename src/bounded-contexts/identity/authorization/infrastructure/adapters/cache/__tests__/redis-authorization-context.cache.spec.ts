import { beforeEach, describe, expect, it } from 'bun:test';
import { Permission } from '../../../../domain/entities/permission.entity';
import { UserAuthContext } from '../../../../domain/entities/user-auth-context.entity';
import { RedisAuthorizationContextCache } from '../redis-authorization-context.cache';

class FakeRedis {
  private readonly store = new Map<string, { value: string; expiresAt: number }>();
  public getCalls = 0;
  public setCalls = 0;
  public delCalls = 0;

  async get(key: string): Promise<string | null> {
    this.getCalls++;
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ...args: Array<string | number>): Promise<unknown> {
    this.setCalls++;
    let ttlMs = 60_000;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === 'PX' && typeof args[i + 1] === 'number') {
        ttlMs = args[i + 1] as number;
        break;
      }
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    this.delCalls++;
    let removed = 0;
    for (const k of keys) {
      if (this.store.delete(k)) removed++;
    }
    return removed;
  }

  async scan(
    cursor: string | number,
    ..._args: Array<string | number>
  ): Promise<[string, string[]]> {
    if (cursor !== '0' && cursor !== 0) return ['0', []];
    return ['0', [...this.store.keys()]];
  }
}

function buildContext(userId: string): UserAuthContext {
  const readResume = Permission.fromPersistence({
    id: 'perm-1',
    resource: 'resume',
    action: 'read',
    description: 'Read resume',
    isSystem: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
  return UserAuthContext.create({
    userId,
    roleIds: ['role_user'],
    groupIds: [],
    permissions: [
      {
        permission: readResume,
        sources: [{ type: 'role', sourceId: 'role_user', sourceName: 'User', inherited: false }],
        granted: true,
      },
    ],
  });
}

describe('RedisAuthorizationContextCache', () => {
  let redis: FakeRedis;
  let cache: RedisAuthorizationContextCache;

  beforeEach(() => {
    redis = new FakeRedis();
    cache = new RedisAuthorizationContextCache(redis);
  });

  it('returns null for an unseen user', async () => {
    expect(await cache.get('user-1')).toBeNull();
  });

  it('round-trips a UserAuthContext through serialize/deserialize without losing permission state', async () => {
    const original = buildContext('user-1');

    await cache.set('user-1', original, 60_000);
    const restored = await cache.get('user-1');

    expect(restored).not.toBeNull();
    expect(restored?.userId).toBe('user-1');
    expect(restored?.hasPermission('resume', 'read')).toBe(true);
    expect(restored?.hasPermission('resume', 'delete')).toBe(false);
    expect(restored?.hasRole('role_user')).toBe(true);
    expect(restored?.grantedPermissionKeys).toEqual(['resume:read']);
  });

  it('forwards the TTL to redis.set as PX milliseconds', async () => {
    const seenArgs: Array<string | number> = [];
    const recordingRedis = {
      ...redis,
      set: async (...args: Array<string | number>) => {
        seenArgs.push(...args);
        return 'OK';
      },
    } as unknown as FakeRedis;
    const recordingCache = new RedisAuthorizationContextCache(recordingRedis);

    await recordingCache.set('user-1', buildContext('user-1'), 1234);

    expect(seenArgs).toContain('PX');
    expect(seenArgs).toContain(1234);
  });

  it('drops the cached entry on invalidate', async () => {
    await cache.set('user-1', buildContext('user-1'), 60_000);

    await cache.invalidate('user-1');

    expect(await cache.get('user-1')).toBeNull();
    expect(redis.delCalls).toBeGreaterThan(0);
  });

  it('drops every entry on invalidateAll via SCAN+DEL', async () => {
    await cache.set('user-1', buildContext('user-1'), 60_000);
    await cache.set('user-2', buildContext('user-2'), 60_000);

    await cache.invalidateAll();

    expect(await cache.get('user-1')).toBeNull();
    expect(await cache.get('user-2')).toBeNull();
  });

  it('returns null instead of throwing when the underlying Redis get blows up', async () => {
    const broken = {
      ...redis,
      get: async () => {
        throw new Error('connection reset');
      },
    } as unknown as FakeRedis;
    const failingCache = new RedisAuthorizationContextCache(broken);

    expect(await failingCache.get('user-1')).toBeNull();
  });

  it('swallows set errors so a Redis blip does not poison the resolve path', async () => {
    const broken = {
      ...redis,
      set: async () => {
        throw new Error('out of memory');
      },
    } as unknown as FakeRedis;
    const failingCache = new RedisAuthorizationContextCache(broken);

    await expect(
      failingCache.set('user-1', buildContext('user-1'), 60_000),
    ).resolves.toBeUndefined();
  });
});
