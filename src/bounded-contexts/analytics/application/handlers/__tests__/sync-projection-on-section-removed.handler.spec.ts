import { describe, expect, it, mock } from 'bun:test';
import { SectionRemovedEvent } from '@/bounded-contexts/resumes';
import { AnalyticsProjectionPort } from '../../ports/analytics-projection.port';
import { SyncProjectionOnSectionRemovedHandler } from '../sync-projection-on-section-removed.handler';

class StubAnalyticsProjection implements AnalyticsProjectionPort {
  decrementSectionCount = mock(async (_resumeId: string, _semanticKind: string) => {});
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
  async incrementSectionCount(_resumeId: string, _semanticKind: string): Promise<void> {
    throw new Error('not used in test');
  }
}

describe('SyncProjectionOnSectionRemovedHandler', () => {
  it('decrements projection count using semantic sectionKind', async () => {
    const projection = new StubAnalyticsProjection();
    const handler = new SyncProjectionOnSectionRemovedHandler(projection);
    const event = new SectionRemovedEvent('resume-1', {
      userId: 'user-1',
      sectionId: 'item-1',
      sectionTypeId: 'st-1',
      sectionTypeKey: 'education_v1',
      sectionKind: 'EDUCATION',
    });

    await handler.handle(event);

    expect(projection.decrementSectionCount).toHaveBeenCalledWith('resume-1', 'EDUCATION');
  });

  it('ignores events without sectionKind', async () => {
    const projection = new StubAnalyticsProjection();
    const handler = new SyncProjectionOnSectionRemovedHandler(projection);
    const event = new SectionRemovedEvent('resume-3', {
      userId: 'user-1',
      sectionId: 'item-3',
    });

    await handler.handle(event);

    expect(projection.decrementSectionCount).not.toHaveBeenCalled();
  });
});
