import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { ShareManagementController } from './share-management.controller';

const createShareService = () => ({
  createShare: mock(() =>
    Promise.resolve({
      id: 'share-1',
      slug: 'my-resume',
      resumeId: 'resume-1',
      isActive: true,
      password: null,
      expiresAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }),
  ),
  listUserShares: mock(() =>
    Promise.resolve([
      {
        id: 'share-1',
        slug: 'my-resume',
        resumeId: 'resume-1',
        isActive: true,
        password: null,
        expiresAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]),
  ),
  deleteShare: mock(() => Promise.resolve()),
});

describe('ShareManagementController - Contract', () => {
  let controller: ShareManagementController;

  beforeEach(() => {
    controller = new ShareManagementController(createShareService() as never);
  });

  it('createShare returns data with share', async () => {
    const result = await controller.createShare({ userId: 'user-1' } as never, {
      resumeId: 'resume-1',
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('share');
  });

  it('listResumeShares returns data with shares', async () => {
    const result = await controller.listResumeShares('resume-1', {
      userId: 'user-1',
    } as never);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('shares');
  });

  it('deleteShare returns data with deleted flag', async () => {
    const result = await controller.deleteShare('share-1', {
      userId: 'user-1',
    } as never);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ deleted: true });
    expect(result.message).toBe('Share deleted successfully');
  });
});
