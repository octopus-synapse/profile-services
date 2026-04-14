import { describe, expect, it, mock } from 'bun:test';
import { ResumeDeletedEvent } from '@/bounded-contexts/resumes';
import { AnalyticsProjectionPort } from '../../ports/analytics-projection.port';
import { SyncProjectionOnResumeDeletedHandler } from '../sync-projection-on-resume-deleted.handler';

class StubAnalyticsProjection implements AnalyticsProjectionPort {
  deleteProjection = mock(async (_resumeId: string) => {});
  async upsertProjection(
    _resumeId: string,
    _data: { userId: string; title: string },
  ): Promise<void> {
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

describe('SyncProjectionOnResumeDeletedHandler', () => {
  it('deletes the analytics projection for the resume', async () => {
    const projection = new StubAnalyticsProjection();
    const handler = new SyncProjectionOnResumeDeletedHandler(projection);
    const event = new ResumeDeletedEvent('resume-1', { userId: 'user-1' });

    await handler.handle(event);

    expect(projection.deleteProjection).toHaveBeenCalledWith('resume-1');
  });

  it('uses event aggregateId as the projection id to delete', async () => {
    const projection = new StubAnalyticsProjection();
    const handler = new SyncProjectionOnResumeDeletedHandler(projection);
    const event = new ResumeDeletedEvent('resume-xyz', { userId: 'user-2' });

    await handler.handle(event);

    expect(projection.deleteProjection).toHaveBeenCalledTimes(1);
    expect(projection.deleteProjection.mock.calls[0][0]).toBe('resume-xyz');
  });
});
