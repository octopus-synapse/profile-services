import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { ResumeCreatedEvent } from '@/bounded-contexts/resumes';
import type { ActivityWithUser } from '../../ports/activity.port';
import { ActivityCreatorPort } from '../../ports/facade.ports';
import { ResumeCreatedActivityHandler } from '../resume-created-activity.handler';

class StubActivityCreator extends ActivityCreatorPort {
  createActivity = mock(
    async (
      userId: string,
      _type: string,
      _metadata?: unknown,
      entityId?: string,
      entityType?: string,
    ): Promise<ActivityWithUser> => ({
      id: 'activity-1',
      userId,
      type: 'RESUME_CREATED',
      metadata: null,
      entityId: entityId ?? null,
      entityType: entityType ?? null,
      createdAt: new Date(),
    }),
  );
}

describe('ResumeCreatedActivityHandler', () => {
  let handler: ResumeCreatedActivityHandler;
  let activityCreator: StubActivityCreator;

  beforeEach(() => {
    activityCreator = new StubActivityCreator();
    handler = new ResumeCreatedActivityHandler(activityCreator);
  });

  it('creates activity with RESUME_CREATED type', async () => {
    const event = new ResumeCreatedEvent('resume-123', {
      userId: 'user-1',
      title: 'Resume',
    });

    await handler.handle(event);

    expect(activityCreator.createActivity).toHaveBeenCalledWith(
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

    expect(activityCreator.createActivity.mock.calls[0][0]).toBe('user-abc');
  });

  it('creates activity with resumeId as entityId', async () => {
    const event = new ResumeCreatedEvent('resume-xyz', {
      userId: 'user-1',
      title: 'Resume',
    });

    await handler.handle(event);

    expect(activityCreator.createActivity.mock.calls[0][3]).toBe('resume-xyz');
  });
});
