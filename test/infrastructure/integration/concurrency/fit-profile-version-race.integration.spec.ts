/**
 * Wave 1.3 P1 #15 — UserFitProfile.version lost-update race.
 *
 * Before the fix: `submit-fit-answers.use-case` read `previous.version`
 * then wrote `previous.version + 1`, so two concurrent submissions for
 * the same user both wrote the same value (version=1 then version=2
 * instead of version=2 then version=3, etc.). The fix moves the bump
 * into the persistence adapter as a single `version: { increment: 1 }`
 * SQL UPDATE.
 *
 * This integration exercise drives the repository adapter directly with
 * `runInParallel` against the real Postgres so the unique post-state
 * proves the SQL-level monotonicity — the in-memory unit test can't
 * because Bun's event loop serialises awaits.
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { FitVector } from '@/bounded-contexts/fit-profile/domain/types';
import { PrismaUserFitProfileRepository } from '@/bounded-contexts/fit-profile/infrastructure/adapters/persistence/prisma-user-fit-profile.repository';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { freshInDbUser } from '../../shared';
import { runInParallel } from '../../shared/race-condition.helper';
import { closeApp, getApp, getPrisma } from '../setup';

const PARALLEL_CALLS = 20;

function makeVector(seed: number): FitVector {
  return {
    bigFive: { O: seed * 0.05, C: 0.1, E: 0.1, A: 0.1, N: 0.1 },
    schwartz: {
      ach: 0.1,
      ben: 0.1,
      hed: 0.1,
      pow: 0.1,
      sec: 0.1,
      sti: 0.1,
      sd: 0.1,
      tra: 0.1,
      uni: 0.1,
      con: 0.1,
    },
    sdt: { aut: 0.1, com: 0.1, rel: 0.1 },
  } as unknown as FitVector;
}

describe('P1 #15 — UserFitProfile.version atomic increment', () => {
  beforeAll(async () => {
    await getApp();
  });

  afterAll(async () => {
    await closeApp();
  });

  it('ends with version === N after N concurrent upserts on the same user', async () => {
    const app = await getApp();
    const fresh = await freshInDbUser(app);
    const repo = new PrismaUserFitProfileRepository(getPrisma() as never, stubLogger);

    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    // 20 parallel upserts. Pre-fix: classic lost-update — multiple
    // writes converge on the same version because the use case read
    // `previous.version` then wrote +1. Post-fix: each call lands on
    // a distinct, monotonic version via `{ increment: 1 }`.
    const { successes, failures } = await runInParallel(PARALLEL_CALLS, (i) =>
      repo.upsert({ userId: fresh.userId, vector: makeVector(i), expiresAt }),
    );

    expect(failures).toEqual([]);
    expect(successes).toHaveLength(PARALLEL_CALLS);

    const finalRow = await getPrisma().userFitProfile.findUnique({
      where: { userId: fresh.userId },
    });
    expect(finalRow).not.toBeNull();
    expect(finalRow?.version).toBe(PARALLEL_CALLS);
  });
});
