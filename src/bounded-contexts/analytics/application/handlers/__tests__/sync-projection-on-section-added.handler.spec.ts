import { describe, expect, it, mock } from 'bun:test';
import { SectionAddedEvent } from '@/bounded-contexts/resumes';
import { SyncProjectionOnSectionAddedHandler } from '../sync-projection-on-section-added.handler';

describe('SyncProjectionOnSectionAddedHandler', () => {
  it('increments projection count using semantic sectionKind', async () => {
    const prisma = {
      analyticsResumeProjection: {
        update: mock(async () => undefined),
      },
    } as unknown as ConstructorParameters<
      typeof SyncProjectionOnSectionAddedHandler
    >[0];

    const handler = new SyncProjectionOnSectionAddedHandler(prisma);
    const event = new SectionAddedEvent('resume-1', {
      userId: 'user-1',
      sectionId: 'item-1',
      sectionTypeId: 'st-1',
      sectionTypeKey: 'work_experience_v1',
      sectionKind: 'WORK_EXPERIENCE',
    });

    await handler.handle(event);

    expect(prisma.analyticsResumeProjection.update).toHaveBeenCalledWith({
      where: { id: 'resume-1' },
      data: { experiencesCount: { increment: 1 } },
    });
  });

  it('ignores unsupported section kinds without updating projection', async () => {
    const prisma = {
      analyticsResumeProjection: {
        update: mock(async () => undefined),
      },
    } as unknown as ConstructorParameters<
      typeof SyncProjectionOnSectionAddedHandler
    >[0];

    const handler = new SyncProjectionOnSectionAddedHandler(prisma);
    const event = new SectionAddedEvent('resume-3', {
      userId: 'user-1',
      sectionId: 'item-3',
      sectionKind: 'SUMMARY',
    });

    await handler.handle(event);

    expect(prisma.analyticsResumeProjection.update).not.toHaveBeenCalled();
  });
});
