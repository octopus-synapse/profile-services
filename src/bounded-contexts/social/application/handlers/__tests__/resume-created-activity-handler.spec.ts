import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { ResumeCreatedActivityHandler } from '../resume-created-activity.handler';
import { ResumeCreatedEvent } from '@/bounded-contexts/resumes';
import { ActivityService } from '../../../social/services/activity.service';

describe('ResumeCreatedActivityHandler', () => {
  let handler: ResumeCreatedActivityHandler;
  let mockActivityService: { createActivity: ReturnType<typeof mock> };

  beforeEach(() => {
    mockActivityService = {
      createActivity: mock(() => Promise.resolve({ id: 'activity-1' })),
    };
    handler = new ResumeCreatedActivityHandler(
      mockActivityService as unknown as ActivityService,
    );
  });

  it('creates activity with RESUME_CREATED type', async () => {
    const event = new ResumeCreatedEvent('resume-123', {
      userId: 'user-1',
      title: 'Resume',
    });

    await handler.handle(event);

    expect(mockActivityService.createActivity).toHaveBeenCalledWith(
      'user-1',
      'RESUME_CREATED',
      { resumeTitle: 'Resume' },
      'resume-123',
      'resume',
    );
  });

  it('creates activity with correct userId', async () => {
    const event = new ResumeCreatedEvent('resume-123', {
      userId: 'user-abc',
      title: 'Resume',
    });

    await handler.handle(event);

    expect(mockActivityService.createActivity.mock.calls[0][0]).toBe(
      'user-abc',
    );
  });

  it('creates activity with resumeId as entityId', async () => {
    const event = new ResumeCreatedEvent('resume-xyz', {
      userId: 'user-1',
      title: 'Resume',
    });

    await handler.handle(event);

    expect(mockActivityService.createActivity.mock.calls[0][3]).toBe(
      'resume-xyz',
    );
  });
});
