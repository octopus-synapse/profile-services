/**
 * Wave 1.3 P1 #19 — ResumeCollaborator quota TOCTOU race.
 *
 * Before: `findCollaborators → check length → create` raced; N
 * concurrent inviters all passed the cap check and inserted. The fix
 * wraps the count + insert in a tx with `SELECT … FOR UPDATE` so
 * concurrent inviters serialise on the locked collaborator rows for
 * the same resume.
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { CollaboratorLimitReachedException } from '@/bounded-contexts/collaboration/domain/exceptions/collaboration.exceptions';
import { PrismaCollaborationRepository } from '@/bounded-contexts/collaboration/sharing/infrastructure/adapters/collaboration.repository';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { freshInDbUser } from '../../shared';
import { runInParallel } from '../../shared/race-condition.helper';
import { closeApp, getApp, getPrisma } from '../setup';

const TEST_MAX_COLLABORATORS = 3;
const OVERSHOOT = 5;
const PARALLEL_CALLS = TEST_MAX_COLLABORATORS + OVERSHOOT;

describe('P1 #19 — ResumeCollaborator quota race', () => {
  beforeAll(async () => {
    await getApp();
  });

  afterAll(async () => {
    await closeApp();
  });

  it('lands exactly max successes under concurrent inviters', async () => {
    const app = await getApp();
    const owner = await freshInDbUser(app);
    const prisma = getPrisma();

    const resume = await prisma.resume.create({
      data: { userId: owner.userId, title: `collab-${randomUUID().slice(0, 6)}` },
      select: { id: true },
    });

    const invitees = await Promise.all(
      Array.from({ length: PARALLEL_CALLS }, () => freshInDbUser(app)),
    );

    const repo = new PrismaCollaborationRepository(prisma as never, stubLogger);

    const { successes, failures } = await runInParallel(PARALLEL_CALLS, (i) =>
      repo.createCollaboratorWithQuota(
        {
          resumeId: resume.id,
          userId: invitees[i].userId,
          role: 'VIEWER',
          invitedBy: owner.userId,
        },
        {
          max: TEST_MAX_COLLABORATORS,
          exception: new CollaboratorLimitReachedException(TEST_MAX_COLLABORATORS),
        },
      ),
    );

    expect(successes).toHaveLength(TEST_MAX_COLLABORATORS);
    expect(failures).toHaveLength(PARALLEL_CALLS - TEST_MAX_COLLABORATORS);
    for (const err of failures) {
      expect(err).toBeInstanceOf(CollaboratorLimitReachedException);
    }

    const persisted = await prisma.resumeCollaborator.count({ where: { resumeId: resume.id } });
    expect(persisted).toBe(TEST_MAX_COLLABORATORS);
  });
});
