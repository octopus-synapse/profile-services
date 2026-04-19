import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { IdempotencyService } from '@/bounded-contexts/platform/common/idempotency/idempotency.service';
import { ResumeCreatedEvent } from '@/bounded-contexts/resumes';
import { AnalyticsRecorder, ResumeCreatedHandler } from '../resume-created.handler';

describe('ResumeCreatedHandler', () => {
  let handler: ResumeCreatedHandler;
  let mockRecorder: { recordResumeCreation: ReturnType<typeof mock> };
  const idempotency = {
    once: <T>(_key: string, fn: () => Promise<T>) => fn(),
  } as unknown as IdempotencyService;

  beforeEach(() => {
    mockRecorder = { recordResumeCreation: mock(() => Promise.resolve()) };
    handler = new ResumeCreatedHandler(mockRecorder as AnalyticsRecorder, idempotency);
  });

  it('records resume creation with correct resumeId', async () => {
    const event = new ResumeCreatedEvent('resume-123', {
      userId: 'user-1',
      title: 'Dev Resume',
    });

    await handler.handle(event);

    expect(mockRecorder.recordResumeCreation).toHaveBeenCalledWith('resume-123', 'user-1');
  });
});
