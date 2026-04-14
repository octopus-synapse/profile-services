import { describe, expect, it, mock } from 'bun:test';
import { SectionAddedEvent } from '@/bounded-contexts/resumes';
import { AnalyticsProjectionPort } from '../../ports/analytics-projection.port';
import { SyncProjectionOnSectionAddedHandler } from '../sync-projection-on-section-added.handler';

class StubAnalyticsProjection implements AnalyticsProjectionPort {
  incrementSectionCount = mock(async (_resumeId: string, _semanticKind: string) => {});
  async upsertProjection(
    _resumeId: string,
    _data: { userId: string; title: string },
  ): Promise<void> {
    throw new Error('not used in test');
  }
  async deleteProjection(_resumeId: string): Promise<void> {
    throw new Error('not used in test');
  }
  async touchProjection(_resumeId: string): Promise<void> {
    throw new Error('not used in test');
  }
  async decrementSectionCount(_resumeId: string, _semanticKind: string): Promise<void> {
    throw new Error('not used in test');
  }
}

describe('SyncProjectionOnSectionAddedHandler', () => {
  it('increments projection count using semantic sectionKind', async () => {
    const projection = new StubAnalyticsProjection();
    const handler = new SyncProjectionOnSectionAddedHandler(projection);
    const event = new SectionAddedEvent('resume-1', {
      userId: 'user-1',
      sectionId: 'item-1',
      sectionTypeId: 'st-1',
      sectionTypeKey: 'work_experience_v1',
      sectionKind: 'WORK_EXPERIENCE',
    });

    await handler.handle(event);

    expect(projection.incrementSectionCount).toHaveBeenCalledWith('resume-1', 'WORK_EXPERIENCE');
  });

  it('ignores events without sectionKind', async () => {
    const projection = new StubAnalyticsProjection();
    const handler = new SyncProjectionOnSectionAddedHandler(projection);
    const event = new SectionAddedEvent('resume-3', {
      userId: 'user-1',
      sectionId: 'item-3',
    });

    await handler.handle(event);

    expect(projection.incrementSectionCount).not.toHaveBeenCalled();
  });
});
