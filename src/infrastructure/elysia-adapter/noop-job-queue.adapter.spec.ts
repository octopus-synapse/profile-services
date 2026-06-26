import { describe, expect, it } from 'bun:test';
import { JobQueuePort } from '@/shared-kernel/jobs/job-queue.port';
import { NoopJobQueueAdapter } from './noop-job-queue.adapter';

describe('NoopJobQueueAdapter', () => {
  it('is a real JobQueuePort (so it inherits the full contract)', () => {
    expect(new NoopJobQueueAdapter()).toBeInstanceOf(JobQueuePort);
  });

  // Regression: the previous inline `as never` literal implemented only
  // register/enqueue/schedule, so `remove()` threw `is not a function`
  // for the sliding-debounce path and corrupted test ordering.
  it('exposes remove() and resolves without throwing', async () => {
    const queue = new NoopJobQueueAdapter();
    expect(typeof queue.remove).toBe('function');
    await expect(queue.remove('resume-quality', 'job-1')).resolves.toBeUndefined();
  });

  it('register/enqueue/schedule are silent no-ops', async () => {
    const queue = new NoopJobQueueAdapter();
    expect(() => queue.register('q', async () => {})).not.toThrow();
    await expect(queue.enqueue('q', { x: 1 })).resolves.toBeUndefined();
    await expect(
      queue.schedule('q', { x: 1 }, { repeat: { pattern: '* * * * *' } }),
    ).resolves.toBeUndefined();
  });
});
