import { beforeEach, describe, expect, it, mock } from 'bun:test';
import {
  EntityNotFoundException,
  ForbiddenException,
} from '@/shared-kernel/exceptions/domain.exceptions';
import {
  ShareRepositoryPort,
  type ShareEntity,
  type ShareWithResume,
} from '../../domain/ports/share.repository.port';
import { DeleteShareUseCase } from './delete-share.use-case';

const makeShare = (overrides: Partial<ShareEntity> = {}): ShareEntity => ({
  id: 'share-456',
  resumeId: 'resume-1',
  slug: 'test-slug',
  password: null,
  expiresAt: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

class StubShareRepository implements ShareRepositoryPort {
  findByIdWithResume = mock(
    async (
      _id: string,
    ): Promise<(ShareEntity & { resume: { userId: string } }) | null> => ({
      ...makeShare(),
      resume: { userId: 'user-123' },
    }),
  );
  delete = mock(async (_id: string): Promise<ShareEntity> => makeShare());
  async create(_data: {
    resumeId: string;
    slug: string;
    password: string | null;
    expiresAt: Date | null;
  }): Promise<ShareEntity> {
    throw new Error('not used in test');
  }
  async findBySlug(_slug: string): Promise<ShareWithResume | null> {
    throw new Error('not used in test');
  }
  async findBySlugOnly(_slug: string): Promise<ShareEntity | null> {
    throw new Error('not used in test');
  }
  async findByResumeId(_resumeId: string): Promise<ShareEntity[]> {
    throw new Error('not used in test');
  }
}

describe('DeleteShareUseCase', () => {
  let useCase: DeleteShareUseCase;
  let shareRepo: StubShareRepository;

  const userId = 'user-123';
  const shareId = 'share-456';

  beforeEach(() => {
    shareRepo = new StubShareRepository();
    useCase = new DeleteShareUseCase(shareRepo);
  });

  it('should delete a share when the user owns it', async () => {
    const result = await useCase.execute(userId, shareId);

    expect(result).toBeDefined();
    expect(result.id).toBe(shareId);
    expect(shareRepo.findByIdWithResume).toHaveBeenCalledWith(shareId);
    expect(shareRepo.delete).toHaveBeenCalledWith(shareId);
  });

  it('should throw EntityNotFoundException when share does not exist', async () => {
    shareRepo.findByIdWithResume = mock(async () => null);

    await expect(useCase.execute(userId, shareId)).rejects.toThrow(EntityNotFoundException);
  });

  it('should throw ForbiddenException when user does not own the share', async () => {
    shareRepo.findByIdWithResume = mock(async () => ({
      ...makeShare(),
      resume: { userId: 'other-user' },
    }));

    await expect(useCase.execute(userId, shareId)).rejects.toThrow(ForbiddenException);
  });

  it('should not call delete when share is not found', async () => {
    shareRepo.findByIdWithResume = mock(async () => null);

    await expect(useCase.execute(userId, shareId)).rejects.toThrow();
    expect(shareRepo.delete).not.toHaveBeenCalled();
  });
});
