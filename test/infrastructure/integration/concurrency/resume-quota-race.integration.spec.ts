/**
 * Wave 1.3 P1 #19 — Resume slot quota TOCTOU race.
 *
 * Before: `listUserResumes → check length → create` raced between
 * concurrent calls; N parallel creators all passed the
 * `length < MAX_RESUMES_PER_USER` check and inserted, so the user
 * ended up with N rows instead of the cap. The fix wraps the count
 * and the insert in a single transaction with `SELECT … FOR UPDATE`
 * so the second caller serialises on the locked rows and trips the
 * cap before its own insert.
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { ResumesRepository } from '@/bounded-contexts/resumes/core/resumes.repository';
import { ResumeSlotLimitReachedException } from '@/bounded-contexts/resumes/domain/exceptions';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { freshInDbUser } from '../../shared';
import { runInParallel } from '../../shared/race-condition.helper';
import { closeApp, getApp, getPrisma } from '../setup';

const MAX_RESUMES_PER_USER = 4;
const OVERSHOOT = 5;
const PARALLEL_CALLS = MAX_RESUMES_PER_USER + OVERSHOOT;

describe('P1 #19 — Resume slot quota race', () => {
  beforeAll(async () => {
    await getApp();
  });

  afterAll(async () => {
    await closeApp();
  });

  it('lands exactly MAX_RESUMES_PER_USER successes under concurrent creators', async () => {
    const app = await getApp();
    const fresh = await freshInDbUser(app);
    const prisma = getPrisma();
    const repo = new ResumesRepository(prisma as never, stubLogger);

    const { successes, failures } = await runInParallel(PARALLEL_CALLS, (i) =>
      repo.createResumeForUserWithQuota(
        fresh.userId,
        { title: `concurrent-${i}`, isPublic: false },
        {
          max: MAX_RESUMES_PER_USER,
          exception: new ResumeSlotLimitReachedException(MAX_RESUMES_PER_USER),
        },
      ),
    );

    expect(successes).toHaveLength(MAX_RESUMES_PER_USER);
    expect(failures).toHaveLength(PARALLEL_CALLS - MAX_RESUMES_PER_USER);
    for (const err of failures) {
      expect(err).toBeInstanceOf(ResumeSlotLimitReachedException);
    }

    const persisted = await prisma.resume.count({ where: { userId: fresh.userId } });
    expect(persisted).toBe(MAX_RESUMES_PER_USER);
  });
});
