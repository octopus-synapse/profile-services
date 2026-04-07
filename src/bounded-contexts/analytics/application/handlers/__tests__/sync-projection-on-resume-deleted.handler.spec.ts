/**
 * SyncProjectionOnResumeDeletedHandler - Unit Tests
 *
 * Verifies the handler deletes the analytics projection
 * when a resume is deleted.
 */

import { describe, expect, it, mock } from 'bun:test';
import { ResumeDeletedEvent } from '@/bounded-contexts/resumes';
import { SyncProjectionOnResumeDeletedHandler } from '../sync-projection-on-resume-deleted.handler';

describe('SyncProjectionOnResumeDeletedHandler', () => {
  it('deletes the analytics projection for the resume', async () => {
    const deleteManyMock = mock(async () => ({ count: 1 }));
    const prisma = {
      analyticsResumeProjection: {
        deleteMany: deleteManyMock,
      },
    } as unknown as ConstructorParameters<typeof SyncProjectionOnResumeDeletedHandler>[0];

    const handler = new SyncProjectionOnResumeDeletedHandler(prisma);
    const event = new ResumeDeletedEvent('resume-1', {
      userId: 'user-1',
    });

    await handler.handle(event);

    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { id: 'resume-1' },
    });
  });

  it('uses event aggregateId as the projection id to delete', async () => {
    const deleteManyMock = mock(async () => ({ count: 1 }));
    const prisma = {
      analyticsResumeProjection: {
        deleteMany: deleteManyMock,
      },
    } as unknown as ConstructorParameters<typeof SyncProjectionOnResumeDeletedHandler>[0];

    const handler = new SyncProjectionOnResumeDeletedHandler(prisma);
    const event = new ResumeDeletedEvent('resume-xyz', {
      userId: 'user-2',
    });

    await handler.handle(event);

    expect(deleteManyMock).toHaveBeenCalledTimes(1);
    const call = deleteManyMock.mock.calls[0][0] as { where: { id: string } };
    expect(call.where.id).toBe('resume-xyz');
  });
});
