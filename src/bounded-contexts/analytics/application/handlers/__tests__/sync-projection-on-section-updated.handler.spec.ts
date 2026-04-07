/**
 * SyncProjectionOnSectionUpdatedHandler - Unit Tests
 *
 * Verifies the handler touches updatedAt on the analytics projection
 * when a section is updated (empty update triggers @updatedAt).
 */

import { describe, expect, it, mock } from 'bun:test';
import { SectionUpdatedEvent } from '@/bounded-contexts/resumes';
import { SyncProjectionOnSectionUpdatedHandler } from '../sync-projection-on-section-updated.handler';

describe('SyncProjectionOnSectionUpdatedHandler', () => {
  it('updates the projection to touch updatedAt', async () => {
    const updateMock = mock(async () => ({}));
    const prisma = {
      analyticsResumeProjection: {
        update: updateMock,
      },
    } as unknown as ConstructorParameters<typeof SyncProjectionOnSectionUpdatedHandler>[0];

    const handler = new SyncProjectionOnSectionUpdatedHandler(prisma);
    const event = new SectionUpdatedEvent('resume-1', {
      userId: 'user-1',
      sectionId: 'section-1',
      sectionTypeKey: 'work_experience_v1',
      sectionKind: 'WORK_EXPERIENCE',
      operation: 'updated',
    });

    await handler.handle(event);

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'resume-1' },
      data: {},
    });
  });

  it('passes correct resumeId from event aggregateId', async () => {
    const updateMock = mock(async () => ({}));
    const prisma = {
      analyticsResumeProjection: {
        update: updateMock,
      },
    } as unknown as ConstructorParameters<typeof SyncProjectionOnSectionUpdatedHandler>[0];

    const handler = new SyncProjectionOnSectionUpdatedHandler(prisma);
    const event = new SectionUpdatedEvent('resume-xyz', {
      userId: 'user-1',
      sectionId: 'section-2',
      operation: 'updated',
    });

    await handler.handle(event);

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'resume-xyz' },
      data: {},
    });
  });
});
