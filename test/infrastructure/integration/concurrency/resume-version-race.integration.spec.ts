/**
 * Wave 1.3 P1 #16 — ResumeVersion.versionNumber race.
 *
 * Before: `findLastVersion + 1 → create` raced between concurrent
 * snapshot / tailor calls; with the `@@unique([resumeId, versionNumber])`
 * constraint in place the losing transaction surfaced a P2002 to the
 * user. After: the adapter retries on unique-violation so every caller
 * lands on a distinct sequential number.
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { PrismaResumeVersionsRepository } from '@/bounded-contexts/resumes/resume-versions/infrastructure/adapters/persistence/prisma-resume-versions.repository';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { freshInDbUser } from '../../shared';
import { runInParallel } from '../../shared/race-condition.helper';
import { closeApp, getApp, getPrisma } from '../setup';

const PARALLEL_CALLS = 10;

describe('P1 #16 — ResumeVersion next-version retry-on-conflict', () => {
  beforeAll(async () => {
    await getApp();
  });

  afterAll(async () => {
    await closeApp();
  });

  it('persists N distinct versionNumbers under N concurrent calls', async () => {
    const app = await getApp();
    const fresh = await freshInDbUser(app);
    const prisma = getPrisma();

    const resume = await prisma.resume.create({
      data: {
        userId: fresh.userId,
        title: `race-${randomUUID().slice(0, 6)}`,
      },
      select: { id: true },
    });

    const repo = new PrismaResumeVersionsRepository(prisma as never, stubLogger);

    const { successes, failures } = await runInParallel(PARALLEL_CALLS, (i) =>
      repo.createNextResumeVersion(resume.id, {
        snapshot: { iteration: i },
        label: `concurrent-${i}`,
      }),
    );

    expect(failures).toEqual([]);
    expect(successes).toHaveLength(PARALLEL_CALLS);

    const versionNumbers = successes.map((v) => v.versionNumber).sort((a, b) => a - b);
    const expected = Array.from({ length: PARALLEL_CALLS }, (_, i) => i + 1);
    expect(versionNumbers).toEqual(expected);

    const persisted = await prisma.resumeVersion.findMany({
      where: { resumeId: resume.id },
      select: { versionNumber: true },
      orderBy: { versionNumber: 'asc' },
    });
    expect(persisted.map((p) => p.versionNumber)).toEqual(expected);
  });
});
