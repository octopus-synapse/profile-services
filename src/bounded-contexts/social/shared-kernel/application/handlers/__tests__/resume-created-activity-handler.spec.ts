import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { ResumeCreatedEvent } from '@/bounded-contexts/resumes';
import type { ActivityUseCases } from '../../../../social/application/ports/activity.port';
import { ResumeCreatedActivityHandler } from '../resume-created-activity.handler';

describe('ResumeCreatedActivityHandler', () => {
  let handler: ResumeCreatedActivityHandler;
  let mockCreateActivity: ReturnType<typeof mock>;

  beforeEach(() => {
    mockCreateActivity = mock(() => Promise.resolve({ id: 'activity-1' }));
    const mockUseCases = {
      createActivityUseCase: {
        execute: mockCreateActivity,
      },
    };
    handler = new ResumeCreatedActivityHandler(mockUseCases as unknown as ActivityUseCases);
  });

  it('creates activity with RESUME_CREATED type', async () => {
    const event = new ResumeCreatedEvent('resume-123', {
      userId: 'user-1',
      title: 'Resume',
    });

    await handler.handle(event);

    expect(mockCreateActivity).toHaveBeenCalledWith(
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

    expect(mockCreateActivity.mock.calls[0][0]).toBe('user-abc');
  });

  it('creates activity with resumeId as entityId', async () => {
    const event = new ResumeCreatedEvent('resume-xyz', {
      userId: 'user-1',
      title: 'Resume',
    });

    await handler.handle(event);

    expect(mockCreateActivity.mock.calls[0][3]).toBe('resume-xyz');
  });
});
