import { describe, expect, it, mock } from 'bun:test';
import { ResumeCreatedEvent } from '@/bounded-contexts/resumes';
import { AnalyticsProjectionPort } from '../../ports/analytics-projection.port';
import { SyncProjectionOnResumeCreatedHandler } from '../sync-projection-on-resume-created.handler';

class StubAnalyticsProjection implements AnalyticsProjectionPort {
  upsertProjection = mock(
    async (_resumeId: string, _data: { userId: string; title: string }) => {},
  );
  async deleteProjection(_resumeId: string): Promise<void> {
    throw new Error('not used in test');
  }
  async touchProjection(_resumeId: string): Promise<void> {
    throw new Error('not used in test');
  }
  async incrementSectionCount(_resumeId: string, _semanticKind: string): Promise<void> {
    throw new Error('not used in test');
  }
  async decrementSectionCount(_resumeId: string, _semanticKind: string): Promise<void> {
    throw new Error('not used in test');
  }
}

describe('SyncProjectionOnResumeCreatedHandler', () => {
  it('upserts analytics projection with correct data', async () => {
    const projection = new StubAnalyticsProjection();
    const handler = new SyncProjectionOnResumeCreatedHandler(projection);
    const event = new ResumeCreatedEvent('resume-1', {
      userId: 'user-1',
      title: 'My Resume',
    });

    await handler.handle(event);

    expect(projection.upsertProjection).toHaveBeenCalledWith('resume-1', {
      userId: 'user-1',
      title: 'My Resume',
    });
  });

  it('uses event aggregateId as the projection id', async () => {
    const projection = new StubAnalyticsProjection();
    const handler = new SyncProjectionOnResumeCreatedHandler(projection);
    const event = new ResumeCreatedEvent('resume-abc', {
      userId: 'user-2',
      title: 'Another Resume',
    });

    await handler.handle(event);

    expect(projection.upsertProjection).toHaveBeenCalledTimes(1);
    const call = projection.upsertProjection.mock.calls[0];
    expect(call[0]).toBe('resume-abc');
  });
});
