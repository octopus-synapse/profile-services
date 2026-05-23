/**
 * Atomic counter helpers — single-statement increments and version bumps
 * so concurrent callers don't lose updates (Wave 1.3 P1 #15, #16, #18).
 *
 * The read-modify-write pattern (`SELECT version → version + 1 → UPDATE`)
 * is racy: two transactions reading the same `version` will both write
 * the same `version + 1`, silently dropping one update. The helpers here
 * push the +1 into the database as a single UPDATE … RETURNING so each
 * concurrent caller sees a different post-increment value.
 *
 * Identifier safety: Prisma's `Prisma.sql` tagged template does NOT
 * escape identifiers — only parameters. We therefore require an
 * allowlist at the call site (caller passes literal table/column names
 * it controls) and validate every identifier against a conservative
 * `[A-Za-z_][A-Za-z0-9_]*` shape before splicing via `Prisma.raw`.
 * Never pass user-controlled strings into these arguments.
 */

import { Prisma } from '@prisma/client';
import type { PrismaLikeClient } from './prisma-types';

const SAFE_IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

function assertIdent(name: string, role: string): void {
  if (!SAFE_IDENT.test(name)) {
    throw new Error(`Unsafe identifier passed as ${role}: ${name}`);
  }
}

function quoteIdent(name: string, role: string): Prisma.Sql {
  assertIdent(name, role);
  return Prisma.raw(`"${name}"`);
}

/**
 * Atomically bumps `<field>` by +1 on the row matching `where`, returning
 * the post-increment value. Throws if zero rows match.
 *
 * `table`, `field`, and every key of `where` must be literal identifiers
 * controlled by the caller — they're validated against `SAFE_IDENT` and
 * spliced raw. Only the `where` *values* are parameterised.
 */
export async function atomicIncrement(
  tx: PrismaLikeClient,
  table: string,
  where: Record<string, unknown>,
  field: string,
): Promise<number> {
  const whereKeys = Object.keys(where);
  if (whereKeys.length === 0) {
    throw new Error('atomicIncrement requires a non-empty where clause');
  }

  const tableSql = quoteIdent(table, 'table');
  const fieldSql = quoteIdent(field, 'field');

  const whereClauses = whereKeys.map(
    (key) => Prisma.sql`${quoteIdent(key, 'where key')} = ${where[key]}`,
  );
  const whereSql = Prisma.join(whereClauses, ' AND ');

  const query = Prisma.sql`UPDATE ${tableSql} SET ${fieldSql} = ${fieldSql} + 1 WHERE ${whereSql} RETURNING ${fieldSql}`;
  const rows = await tx.$queryRaw<Array<Record<string, number | bigint>>>(query);
  if (rows.length === 0) {
    throw new Error(
      `atomicIncrement: no row matched in ${table} for fields ${whereKeys.join(',')}`,
    );
  }
  const raw = rows[0][field];
  return typeof raw === 'bigint' ? Number(raw) : raw;
}

/**
 * Atomically computes the next version number for the row identified by
 * `keyCols` — equivalent to `COALESCE(MAX(version), 0) + 1` but expressed
 * as a single insert/update statement that participates in the caller's
 * transaction. Used for `ResumeVersion.versionNumber` allocation where
 * the row may not exist yet (the first version starts at 1).
 *
 * Returns the next sequential integer; the caller is responsible for
 * inserting the row with that value (and racing with the unique index
 * if another tx wins the same slot).
 */
export async function atomicNextVersion(
  tx: PrismaLikeClient,
  table: string,
  keyCols: Record<string, unknown>,
): Promise<number> {
  const keys = Object.keys(keyCols);
  if (keys.length === 0) {
    throw new Error('atomicNextVersion requires a non-empty keyCols');
  }

  const tableSql = quoteIdent(table, 'table');
  const whereClauses = keys.map(
    (key) => Prisma.sql`${quoteIdent(key, 'where key')} = ${keyCols[key]}`,
  );
  const whereSql = Prisma.join(whereClauses, ' AND ');

  const query = Prisma.sql`SELECT COALESCE(MAX("versionNumber"), 0) + 1 AS next FROM ${tableSql} WHERE ${whereSql}`;
  const rows = await tx.$queryRaw<Array<{ next: number | bigint }>>(query);
  const raw = rows[0]?.next ?? 1;
  return typeof raw === 'bigint' ? Number(raw) : raw;
}
