import { describe, expect, it } from 'bun:test';
import { Prisma } from '@prisma/client';
import { atomicIncrement, atomicNextVersion } from './atomic-counters';
import type { PrismaLikeClient } from './prisma-types';

/**
 * Unit tests using a Prisma-like stub. We assert on:
 *   - the SQL fragment shape (table/field interpolated, values
 *     parameterised),
 *   - rejection of unsafe identifiers,
 *   - return-value coercion from BigInt.
 *
 * Integration coverage (real Postgres + `runInParallel`) lands in the
 * use-case specs that adopt the helpers (P1 #15 / #16 / #18).
 */

interface QueryCapture {
  readonly sql: string;
  readonly values: readonly unknown[];
}

function makeStub(rows: Array<Record<string, unknown>>): {
  client: PrismaLikeClient;
  captured: QueryCapture[];
} {
  const captured: QueryCapture[] = [];
  const client = {
    $queryRaw: (query: Prisma.Sql) => {
      captured.push({ sql: query.sql, values: query.values });
      return Promise.resolve(rows);
    },
  } as unknown as PrismaLikeClient;
  return { client, captured };
}

describe('atomicIncrement', () => {
  it('emits a single UPDATE … RETURNING with parameterised values', async () => {
    const { client, captured } = makeStub([{ version: 7 }]);
    const next = await atomicIncrement(client, 'UserFitProfile', { userId: 'u-1' }, 'version');
    expect(next).toBe(7);
    expect(captured).toHaveLength(1);
    expect(captured[0].sql).toContain('UPDATE "UserFitProfile"');
    expect(captured[0].sql).toContain('"version" = "version" + 1');
    expect(captured[0].sql).toContain('RETURNING "version"');
    expect(captured[0].values).toEqual(['u-1']);
  });

  it('coerces BigInt return values', async () => {
    const { client } = makeStub([{ version: BigInt(42) }]);
    const next = await atomicIncrement(client, 'UserFitProfile', { userId: 'u-1' }, 'version');
    expect(next).toBe(42);
  });

  it('throws on unsafe table identifier', async () => {
    const { client } = makeStub([{ version: 1 }]);
    await expect(
      atomicIncrement(client, 'Users; DROP TABLE x;--', { userId: 'u-1' }, 'version'),
    ).rejects.toThrow(/Unsafe identifier/);
  });

  it('throws on unsafe field identifier', async () => {
    const { client } = makeStub([{ version: 1 }]);
    await expect(
      atomicIncrement(client, 'UserFitProfile', { userId: 'u-1' }, 'version") --'),
    ).rejects.toThrow(/Unsafe identifier/);
  });

  it('throws on unsafe where key identifier', async () => {
    const { client } = makeStub([{ version: 1 }]);
    await expect(
      atomicIncrement(client, 'UserFitProfile', { 'userId; DROP': 'u-1' }, 'version'),
    ).rejects.toThrow(/Unsafe identifier/);
  });

  it('throws when zero rows matched', async () => {
    const { client } = makeStub([]);
    await expect(
      atomicIncrement(client, 'UserFitProfile', { userId: 'missing' }, 'version'),
    ).rejects.toThrow(/no row matched/);
  });

  it('rejects empty where', async () => {
    const { client } = makeStub([{ version: 1 }]);
    await expect(atomicIncrement(client, 'UserFitProfile', {}, 'version')).rejects.toThrow(
      /non-empty where/,
    );
  });
});

describe('atomicNextVersion', () => {
  it('returns COALESCE(MAX) + 1 from the stub', async () => {
    const { client, captured } = makeStub([{ next: 5 }]);
    const next = await atomicNextVersion(client, 'resume_versions', { resumeId: 'r-1' });
    expect(next).toBe(5);
    expect(captured[0].sql).toContain('COALESCE(MAX("versionNumber"), 0) + 1');
    expect(captured[0].sql).toContain('FROM "resume_versions"');
    expect(captured[0].values).toEqual(['r-1']);
  });

  it('defaults to 1 when no rows exist', async () => {
    const { client } = makeStub([]);
    const next = await atomicNextVersion(client, 'resume_versions', { resumeId: 'r-1' });
    expect(next).toBe(1);
  });

  it('coerces BigInt', async () => {
    const { client } = makeStub([{ next: BigInt(12) }]);
    const next = await atomicNextVersion(client, 'resume_versions', { resumeId: 'r-1' });
    expect(next).toBe(12);
  });

  it('rejects empty keyCols', async () => {
    const { client } = makeStub([{ next: 1 }]);
    await expect(atomicNextVersion(client, 'resume_versions', {})).rejects.toThrow(
      /non-empty keyCols/,
    );
  });
});
