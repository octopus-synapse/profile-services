import { describe, expect, it } from 'bun:test';
import { SessionInvalidationAdapter } from './session-invalidation.adapter';

describe('SessionInvalidationAdapter', () => {
  it('keeps the revocation marker until the longest session expires', async () => {
    const writes: Array<{ key: string; ttl: number }> = [];
    const deleted: string[] = [];
    const adapter = new SessionInvalidationAdapter(
      {
        setSecure: async (key: string, _value: number, ttl: number) => {
          writes.push({ key, ttl });
        },
      } as never,
      {
        refreshToken: {
          deleteMany: async ({ where }: { where: { userId: string } }) => {
            deleted.push(where.userId);
          },
        },
      } as never,
      45,
    );

    await adapter.invalidateAllSessions('user-1');
    expect(writes).toEqual([{ key: 'auth:token_valid_after:user-1', ttl: 45 * 24 * 60 * 60 }]);
    expect(deleted).toEqual(['user-1']);
  });
});
