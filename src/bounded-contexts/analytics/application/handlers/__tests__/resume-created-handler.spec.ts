import { describe, it, expect, mock, beforeEach } from 'bun:test';
import {
  ResumeCreatedHandler,
  AnalyticsRecorder,
} from '../resume-created.handler';
import { ResumeCreatedEvent } from '@/bounded-contexts/resumes';

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

    expect(mockRecorder.recordResumeCreation).toHaveBeenCalledWith(
      'resume-123',
      'user-1',
    );
  });
});
