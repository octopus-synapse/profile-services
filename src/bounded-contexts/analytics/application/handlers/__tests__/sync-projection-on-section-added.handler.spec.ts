import { describe, expect, it, mock } from 'bun:test';
import { SectionAddedEvent } from '@/bounded-contexts/resumes';
import { SyncProjectionOnSectionAddedHandler } from '../sync-projection-on-section-added.handler';

describe('SyncProjectionOnSectionAddedHandler', () => {
  it('increments projection count using semantic sectionKind', async () => {
    const prisma = {
      $executeRaw: mock(async () => 1),
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

    expect(prisma.$executeRaw).toHaveBeenCalled();
  });

  it('ignores events without sectionKind', async () => {
    const prisma = {
      $executeRaw: mock(async () => 1),
    } as unknown as ConstructorParameters<
      typeof SyncProjectionOnSectionAddedHandler
    >[0];

    const handler = new SyncProjectionOnSectionAddedHandler(prisma);
    const event = new SectionAddedEvent('resume-3', {
      userId: 'user-1',
      sectionId: 'item-3',
      // No sectionKind provided
    });

    await handler.handle(event);

    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });
});
