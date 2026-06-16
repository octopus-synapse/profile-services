import { describe, expect, it } from 'bun:test';
import { ResumeUpdatedEvent } from '@/bounded-contexts/resumes/domain/events';
import { JobQueuePort } from '@/shared-kernel/jobs/job-queue.port';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { RESUME_QUALITY_QUEUE } from '../workers/resume-quality.worker';
import {
  changeRequiresAi,
  ResumeQualityOnResumeUpdatedHandler,
} from './resume-quality-on-resume-updated.handler';

class FakeQueue extends JobQueuePort {
  public enqueued: Array<{ data: unknown; opts: unknown }> = [];
  public removed: Array<{ queue: string; jobId: string }> = [];
  register() {}
  async enqueue<T>(_queue: string, data: T, opts?: unknown): Promise<void> {
    this.enqueued.push({ data, opts });
  }
  async schedule(): Promise<void> {}
  override async remove(queue: string, jobId: string): Promise<void> {
    this.removed.push({ queue, jobId });
  }
}

function updateEvent(changedFields: string[]) {
  return new ResumeUpdatedEvent('r1', { userId: 'u1', changedFields });
}

describe('changeRequiresAi', () => {
  it('triggers on the summary scalar field', () => {
    expect(changeRequiresAi(['summary'])).toBe(true);
  });
  it('triggers on gradeable section kinds', () => {
    expect(changeRequiresAi(['sections:WORK_EXPERIENCE'])).toBe(true);
    expect(changeRequiresAi(['sections:PROJECT'])).toBe(true);
  });
  it('does NOT trigger on style/title/language or skills/education sections', () => {
    expect(changeRequiresAi(['title', 'styleId', 'language'])).toBe(false);
    expect(changeRequiresAi(['sections:SKILL_SET'])).toBe(false);
    expect(changeRequiresAi(['sections:EDUCATION'])).toBe(false);
  });
});

describe('ResumeQualityOnResumeUpdatedHandler', () => {
  it('debounces AI-bearing recomputes (removes in-flight job + delays)', async () => {
    const queue = new FakeQueue();
    const handler = new ResumeQualityOnResumeUpdatedHandler(queue, stubLogger);

    await handler.onResumeUpdated(updateEvent(['sections:WORK_EXPERIENCE']));

    expect(queue.removed).toEqual([
      { queue: RESUME_QUALITY_QUEUE, jobId: 'resume-quality:r1' },
    ]);
    expect(queue.enqueued).toHaveLength(1);
    expect(queue.enqueued[0]?.data).toMatchObject({ resumeId: 'r1', runAi: true });
    expect(queue.enqueued[0]?.opts).toMatchObject({ delay: 15_000 });
  });

  it('runs completeness-only recompute immediately for non-content edits', async () => {
    const queue = new FakeQueue();
    const handler = new ResumeQualityOnResumeUpdatedHandler(queue, stubLogger);

    await handler.onResumeUpdated(updateEvent(['styleId']));

    expect(queue.removed).toEqual([]); // no debounce
    expect(queue.enqueued[0]?.data).toMatchObject({ runAi: false });
    expect(queue.enqueued[0]?.opts).toMatchObject({ delay: 0 });
  });
});
