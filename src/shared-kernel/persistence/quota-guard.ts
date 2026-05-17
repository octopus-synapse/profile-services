/**
 * Quota guard — enforces a "≤ N rows" cap inside an open transaction so
 * concurrent creators can't bypass the limit via TOCTOU (Wave 1.3 P1
 * #19).
 *
 * The classic bug:
 *   1. Two requests load `count = N - 1` in parallel (read-then-decide).
 *   2. Both pass the `count < MAX` check.
 *   3. Both insert → final count is `N + 1`.
 *
 * The fix is a `SELECT COUNT(*) … FOR UPDATE` so concurrent transactions
 * serialise on the locked rows; the second one only sees the
 * post-insert count and trips the cap. The caller composes the
 * `countSql` so the where clause stays close to the entity it's
 * counting — quota-guard doesn't try to abstract the predicate.
 */

import type { Prisma } from '@prisma/client';
import type { PrismaLikeClient } from './prisma-types';

export interface EnforceQuotaOptions<E extends Error> {
  /**
   * `SELECT COUNT(*) FROM "Foo" WHERE "userId" = ${userId} FOR UPDATE`
   * — the caller assembles the predicate AND the `FOR UPDATE` lock hint
   * so the lock target stays explicit. We don't auto-append `FOR UPDATE`
   * because some callers may want `FOR NO KEY UPDATE` or a different
   * lock granularity.
   */
  readonly countSql: Prisma.Sql;
  readonly max: number;
  readonly exception: E;
}

/**
 * Throws `opts.exception` when the lockable row count returned by
 * `opts.countSql` is `>= opts.max`. Must run inside a transaction —
 * otherwise the `FOR UPDATE` clause has no effect and the guard
 * degrades back to a TOCTOU race.
 */
export async function enforceQuotaInTx<E extends Error>(
  tx: PrismaLikeClient,
  opts: EnforceQuotaOptions<E>,
): Promise<void> {
  const rows = await tx.$queryRaw<Array<{ count: number | bigint }>>(opts.countSql);
  const raw = rows[0]?.count ?? 0;
  const count = typeof raw === 'bigint' ? Number(raw) : raw;
  if (count >= opts.max) {
    throw opts.exception;
  }
}
