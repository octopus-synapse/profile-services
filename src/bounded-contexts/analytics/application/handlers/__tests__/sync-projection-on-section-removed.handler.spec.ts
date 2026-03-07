import { describe, expect, it, mock } from 'bun:test';
import { SectionRemovedEvent } from '@/bounded-contexts/resumes';
import { SyncProjectionOnSectionRemovedHandler } from '../sync-projection-on-section-removed.handler';

describe('SyncProjectionOnSectionRemovedHandler', () => {
  it('decrements projection count using semantic sectionKind', async () => {
    const prisma = {
      $executeRaw: mock(async () => 1),
    } as unknown as ConstructorParameters<typeof SyncProjectionOnSectionRemovedHandler>[0];

    const handler = new SyncProjectionOnSectionRemovedHandler(prisma);
    const event = new SectionRemovedEvent('resume-1', {
      userId: 'user-1',
      sectionId: 'item-1',
      sectionTypeId: 'st-1',
      sectionTypeKey: 'education_v1',
      sectionKind: 'EDUCATION',
    });

    await handler.handle(event);

    expect(prisma.$executeRaw).toHaveBeenCalled();
  });

  it('ignores events without sectionKind', async () => {
    const prisma = {
      $executeRaw: mock(async () => 1),
    } as unknown as ConstructorParameters<typeof SyncProjectionOnSectionRemovedHandler>[0];

    const handler = new SyncProjectionOnSectionRemovedHandler(prisma);
    const event = new SectionRemovedEvent('resume-3', {
      userId: 'user-1',
      sectionId: 'item-3',
      // No sectionKind provided
    });

    await handler.handle(event);

    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });
});
