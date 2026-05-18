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
 * Serialise concurrent transactions via `lockSql` BEFORE counting:
 * lock a parent row (typical: the User row for per-user quotas) or
 * acquire a `pg_advisory_xact_lock(hashtext(...))` on a logical key.
 * The second transaction blocks on the lock, observes the post-insert
 * count, and trips the cap.
 *
 * Older callers used `SELECT COUNT(*) ... FOR UPDATE` to fold the lock
 * into the count. Postgres rejects that with `0A000 FOR UPDATE is not
 * allowed with aggregate functions`, so the lock MUST be a separate
 * query — hence `lockSql` is its own field.
 */

import type { Prisma } from '@prisma/client';
import type { PrismaLikeClient } from './prisma-types';

export interface EnforceQuotaOptions<E extends Error> {
  /**
   * Optional row-level / advisory lock acquired BEFORE counting. Runs
   * via `$executeRaw` so it can carry `FOR UPDATE`, `pg_advisory_xact_lock`,
   * etc. The caller picks the granularity (User row, parent entity row,
   * advisory key) — quota-guard just makes sure it runs first.
   * If omitted the guard falls back to a TOCTOU-prone read; that's only
   * safe when concurrency for the keyed predicate is structurally
   * impossible.
   */
  readonly lockSql?: Prisma.Sql;
  /**
   * Plain `SELECT COUNT(*)::int AS "count" FROM "Foo" WHERE …` — no
   * `FOR UPDATE` here (use `lockSql` for serialisation, which Postgres
   * disallows in the same query as an aggregate).
   */
  readonly countSql: Prisma.Sql;
  readonly max: number;
  readonly exception: E;
}

/**
 * Throws `opts.exception` when the count returned by `opts.countSql`
 * is `>= opts.max`. Must run inside a transaction so the
 * lock (if any) survives until commit.
 */
export async function enforceQuotaInTx<E extends Error>(
  tx: PrismaLikeClient,
  opts: EnforceQuotaOptions<E>,
): Promise<void> {
  if (opts.lockSql) {
    await tx.$executeRaw(opts.lockSql);
  }
  const rows = await tx.$queryRaw<Array<{ count: number | bigint }>>(opts.countSql);
  const raw = rows[0]?.count ?? 0;
  const count = typeof raw === 'bigint' ? Number(raw) : raw;
  if (count >= opts.max) {
    throw opts.exception;
  }
}
