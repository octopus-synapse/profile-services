import { describe, expect, it } from 'bun:test';
import { Prisma } from '@prisma/client';
import type { PrismaLikeClient } from './prisma-types';
import { enforceQuotaInTx } from './quota-guard';

class FakeQuotaError extends Error {
  readonly code = 'QUOTA';
}

function makeStub(rows: Array<{ count: number | bigint }>): PrismaLikeClient {
  return {
    $queryRaw: () => Promise.resolve(rows),
  } as unknown as PrismaLikeClient;
}

describe('enforceQuotaInTx', () => {
  const countSql = Prisma.sql`SELECT COUNT(*) AS count FROM "Resume" WHERE "userId" = ${'u-1'} FOR UPDATE`;

  it('passes silently when count < max', async () => {
    const tx = makeStub([{ count: 3 }]);
    await expect(
      enforceQuotaInTx(tx, { countSql, max: 4, exception: new FakeQuotaError('over') }),
    ).resolves.toBeUndefined();
  });

  it('throws when count >= max', async () => {
    const tx = makeStub([{ count: 4 }]);
    await expect(
      enforceQuotaInTx(tx, { countSql, max: 4, exception: new FakeQuotaError('over') }),
    ).rejects.toThrow(FakeQuotaError);
  });

  it('coerces BigInt counts', async () => {
    const tx = makeStub([{ count: BigInt(4) }]);
    await expect(
      enforceQuotaInTx(tx, { countSql, max: 4, exception: new FakeQuotaError('over') }),
    ).rejects.toThrow(FakeQuotaError);
  });

  it('treats missing row as count 0', async () => {
    const tx = makeStub([]);
    await expect(
      enforceQuotaInTx(tx, { countSql, max: 1, exception: new FakeQuotaError('over') }),
    ).resolves.toBeUndefined();
  });
});
