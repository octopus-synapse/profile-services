import { beforeEach, describe, expect, it } from 'bun:test';
import { UserAuthContext } from '../../../../domain/entities/user-auth-context.entity';
import { InMemoryAuthorizationContextCache } from '../in-memory-authorization-context.cache';

describe('InMemoryAuthorizationContextCache', () => {
  let cache: InMemoryAuthorizationContextCache;

  beforeEach(() => {
    cache = new InMemoryAuthorizationContextCache();
  });

  it('returns null for an unseen user', async () => {
    expect(await cache.get('user-1')).toBeNull();
  });

  it('returns the cached context within the TTL window', async () => {
    const ctx = UserAuthContext.empty('user-1');

    await cache.set('user-1', ctx, 60_000);

    expect(await cache.get('user-1')).toBe(ctx);
  });

  it('returns null after the TTL has elapsed', async () => {
    const ctx = UserAuthContext.empty('user-1');

    await cache.set('user-1', ctx, -1);

    expect(await cache.get('user-1')).toBeNull();
  });

  it('drops the cached entry on invalidate', async () => {
    const ctx = UserAuthContext.empty('user-1');
    await cache.set('user-1', ctx, 60_000);

    await cache.invalidate('user-1');

    expect(await cache.get('user-1')).toBeNull();
  });

  it('drops every entry on invalidateAll', async () => {
    await cache.set('user-1', UserAuthContext.empty('user-1'), 60_000);
    await cache.set('user-2', UserAuthContext.empty('user-2'), 60_000);

    await cache.invalidateAll();

    expect(await cache.get('user-1')).toBeNull();
    expect(await cache.get('user-2')).toBeNull();
  });

  it('evicts the oldest entry when maxSize is reached', async () => {
    const small = new InMemoryAuthorizationContextCache(2);

    await small.set('user-1', UserAuthContext.empty('user-1'), 60_000);
    await small.set('user-2', UserAuthContext.empty('user-2'), 60_000);
    await small.set('user-3', UserAuthContext.empty('user-3'), 60_000);

    expect(await small.get('user-1')).toBeNull();
    expect(await small.get('user-2')).not.toBeNull();
    expect(await small.get('user-3')).not.toBeNull();
  });
});
