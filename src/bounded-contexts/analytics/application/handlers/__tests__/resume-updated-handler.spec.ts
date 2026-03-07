import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { ResumeUpdatedEvent } from '@/bounded-contexts/resumes';
import { ResumeUpdatedHandler, ViewTracker } from '../resume-updated.handler';

describe('ResumeUpdatedHandler', () => {
  let handler: ResumeUpdatedHandler;
  let mockTracker: { trackResumeUpdate: ReturnType<typeof mock> };

  beforeEach(() => {
    mockTracker = { trackResumeUpdate: mock(() => Promise.resolve()) };
    handler = new ResumeUpdatedHandler(mockTracker as ViewTracker);
  });

  it('tracks resume update with correct fields', async () => {
    const event = new ResumeUpdatedEvent('resume-123', {
      userId: 'user-1',
      changedFields: ['title', 'summary'],
    });

    await handler.handle(event);

    expect(mockTracker.trackResumeUpdate).toHaveBeenCalledWith('resume-123', ['title', 'summary']);
  });
});
