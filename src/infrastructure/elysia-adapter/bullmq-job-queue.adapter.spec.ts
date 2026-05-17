import { describe, expect, it } from 'bun:test';
import { BullMQJobQueueAdapter } from './bullmq-job-queue.adapter';

describe('BullMQJobQueueAdapter.enqueue (P1 #42)', () => {
  it('forwards jobId so BullMQ can dedup identical idempotent enqueues', async () => {
    const recorded: Array<{ name: string; data: unknown; opts: unknown }> = [];
    const fakeQueue = {
      add: (name: string, data: unknown, opts: unknown) => {
        recorded.push({ name, data, opts });
        return Promise.resolve();
      },
    };

    const adapter = new BullMQJobQueueAdapter({ host: 'localhost', port: 6379 });
    (adapter as unknown as { queues: Map<string, unknown> }).queues.set('test-queue', fakeQueue);

    await adapter.enqueue('test-queue', { id: 1 }, { jobId: 'abc' });
    await adapter.enqueue('test-queue', { id: 1 }, { jobId: 'abc' });

    expect(recorded).toHaveLength(2);
    expect((recorded[0].opts as { jobId?: string }).jobId).toBe('abc');
    expect((recorded[1].opts as { jobId?: string }).jobId).toBe('abc');
  });
});
