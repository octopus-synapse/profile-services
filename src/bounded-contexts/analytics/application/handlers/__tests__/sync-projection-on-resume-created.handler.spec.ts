/**
 * SyncProjectionOnResumeCreatedHandler - Unit Tests
 *
 * Verifies the handler creates an analytics projection
 * when a resume is created.
 */

import { describe, expect, it, mock } from 'bun:test';
import { ResumeCreatedEvent } from '@/bounded-contexts/resumes';
import { SyncProjectionOnResumeCreatedHandler } from '../sync-projection-on-resume-created.handler';

describe('SyncProjectionOnResumeCreatedHandler', () => {
  it('upserts analytics projection with correct data', async () => {
    const upsertMock = mock(async () => ({}));
    const prisma = {
      analyticsResumeProjection: {
        upsert: upsertMock,
      },
    } as unknown as ConstructorParameters<typeof SyncProjectionOnResumeCreatedHandler>[0];

    const handler = new SyncProjectionOnResumeCreatedHandler(prisma);
    const event = new ResumeCreatedEvent('resume-1', {
      userId: 'user-1',
      title: 'My Resume',
    });

    await handler.handle(event);

    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: 'resume-1' },
      create: {
        id: 'resume-1',
        userId: 'user-1',
        title: 'My Resume',
        sectionCounts: {},
      },
      update: {
        userId: 'user-1',
        title: 'My Resume',
      },
    });
  });

  it('uses event aggregateId as the projection id', async () => {
    const upsertMock = mock(async (_args: { where: { id: string } }) => ({}));
    const prisma = {
      analyticsResumeProjection: {
        upsert: upsertMock,
      },
    } as unknown as ConstructorParameters<typeof SyncProjectionOnResumeCreatedHandler>[0];

    const handler = new SyncProjectionOnResumeCreatedHandler(prisma);
    const event = new ResumeCreatedEvent('resume-abc', {
      userId: 'user-2',
      title: 'Another Resume',
    });

    await handler.handle(event);

    expect(upsertMock).toHaveBeenCalledTimes(1);
    const call = upsertMock.mock.calls[0][0];
    expect(call.where.id).toBe('resume-abc');
  });
});
