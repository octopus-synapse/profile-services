import { describe, expect, it } from 'bun:test';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { ResumeTailorService } from '@/bounded-contexts/resumes/resume-versions/application/services/resume-tailor.service';
import { type JobOpts, type JobProcessor, JobQueuePort } from '@/shared-kernel/jobs/job-queue.port';
import { stubLogger } from '@/shared-kernel/logger/testing';
import type { CuratedSelectorService } from '../application/services/curated-selector.service';
import { AutomationWorkerUnavailableException } from '../domain/exceptions/automation.exceptions';
import { AutoApplyWorker } from './auto-apply.worker';

function buildPrisma(users: Array<{ id: string; roles: string[] }>): PrismaService {
  return {
    user: {
      findMany: async () => users,
    },
  } as unknown as PrismaService;
}

class FailingQueue extends JobQueuePort {
  register<T>(_queue: string, _processor: JobProcessor<T>): void {}
  async enqueue<T>(_queue: string, _data: T, _opts?: JobOpts): Promise<void> {
    throw new Error('Connection refused');
  }
  async schedule<T>(_queue: string, _data: T, _delayMs: number, _opts?: JobOpts): Promise<void> {}
}

describe('AutoApplyWorker', () => {
  it('wraps queue.enqueue failures in AutomationWorkerUnavailableException', async () => {
    // ADMIN role grants AUTO_APPLY permission per the authorization matrix
    // (`role_admin` includes the `grp_automation_beta` group).
    const prisma = buildPrisma([{ id: 'u-1', roles: ['role_admin'] }]);
    const worker = new AutoApplyWorker(
      prisma,
      {} as CuratedSelectorService,
      {} as ResumeTailorService,
      new FailingQueue(),
      stubLogger,
    );

    await expect(worker.process({ data: { kind: 'schedule' } })).rejects.toBeInstanceOf(
      AutomationWorkerUnavailableException,
    );
  });
});
