import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { ResumeCreatedEvent } from '@/bounded-contexts/resumes';
import { AnalyticsRecorder, ResumeCreatedHandler } from '../resume-created.handler';

describe('ResumeCreatedHandler', () => {
  let handler: ResumeCreatedHandler;
  let mockRecorder: { recordResumeCreation: ReturnType<typeof mock> };

  beforeEach(() => {
    mockRecorder = { recordResumeCreation: mock(() => Promise.resolve()) };
    handler = new ResumeCreatedHandler(mockRecorder as AnalyticsRecorder);
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
