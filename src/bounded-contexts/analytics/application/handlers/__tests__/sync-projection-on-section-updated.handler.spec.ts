import { describe, expect, it, mock } from 'bun:test';
import { SectionUpdatedEvent } from '@/bounded-contexts/resumes';
import { AnalyticsProjectionPort } from '../../ports/analytics-projection.port';
import { SyncProjectionOnSectionUpdatedHandler } from '../sync-projection-on-section-updated.handler';

class StubAnalyticsProjection implements AnalyticsProjectionPort {
  touchProjection = mock(async (_resumeId: string) => {});
  async upsertProjection(
    _resumeId: string,
    _data: { userId: string; title: string },
  ): Promise<void> {
    throw new Error('not used in test');
  }
  async deleteProjection(_resumeId: string): Promise<void> {
    throw new Error('not used in test');
  }
  async incrementSectionCount(_resumeId: string, _semanticKind: string): Promise<void> {
    throw new Error('not used in test');
  }
  async decrementSectionCount(_resumeId: string, _semanticKind: string): Promise<void> {
    throw new Error('not used in test');
  }
}

describe('SyncProjectionOnSectionUpdatedHandler', () => {
  it('touches the projection for the event resumeId', async () => {
    const projection = new StubAnalyticsProjection();
    const handler = new SyncProjectionOnSectionUpdatedHandler(projection);
    const event = new SectionUpdatedEvent('resume-1', {
      userId: 'user-1',
      sectionId: 'section-1',
      sectionTypeKey: 'work_experience_v1',
      sectionKind: 'WORK_EXPERIENCE',
      operation: 'updated',
    });

    await handler.handle(event);

    expect(projection.touchProjection).toHaveBeenCalledWith('resume-1');
  });

  it('passes correct resumeId from event aggregateId', async () => {
    const projection = new StubAnalyticsProjection();
    const handler = new SyncProjectionOnSectionUpdatedHandler(projection);
    const event = new SectionUpdatedEvent('resume-xyz', {
      userId: 'user-1',
      sectionId: 'section-2',
      operation: 'updated',
    });

    await handler.handle(event);

    expect(projection.touchProjection).toHaveBeenCalledWith('resume-xyz');
  });
});
