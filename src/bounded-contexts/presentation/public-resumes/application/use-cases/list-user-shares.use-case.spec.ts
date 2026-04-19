import { beforeEach, describe, expect, it, mock } from 'bun:test';
import {
  EntityNotFoundException,
  ForbiddenException,
} from '@/shared-kernel/exceptions/domain.exceptions';
import { ResumeReadRepositoryPort } from '../../domain/ports/resume-read.repository.port';
import {
  type ShareEntity,
  ShareRepositoryPort,
  type ShareWithResume,
} from '../../domain/ports/share.repository.port';
import { ListUserSharesUseCase } from './list-user-shares.use-case';

const makeShare = (overrides: Partial<ShareEntity>): ShareEntity => ({
  id: 'share-1',
  resumeId: 'resume-456',
  slug: 'slug-1',
  password: null,
  expiresAt: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

type ResumeWithSections = Awaited<ReturnType<ResumeReadRepositoryPort['findByIdWithSections']>>;

class StubShareRepository implements ShareRepositoryPort {
  findByResumeId = mock(
    async (resumeId: string): Promise<ShareEntity[]> => [
      makeShare({ id: 'share-1', slug: 'slug-1', resumeId }),
      makeShare({ id: 'share-2', slug: 'slug-2', resumeId }),
    ],
  );
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
  async findByIdWithResume(
    _id: string,
  ): Promise<(ShareEntity & { resume: { userId: string } }) | null> {
    throw new Error('not used in test');
  }
  async delete(_id: string): Promise<ShareEntity> {
    throw new Error('not used in test');
  }
}

class StubResumeReadRepository implements ResumeReadRepositoryPort {
  findById = mock(
    async (_id: string): Promise<{ id: string; userId: string } | null> => ({
      id: 'resume-456',
      userId: 'user-123',
    }),
  );
  async findByIdWithSections(_id: string): Promise<ResumeWithSections> {
    throw new Error('not used in test');
  }
}

describe('ListUserSharesUseCase', () => {
  let useCase: ListUserSharesUseCase;
  let shareRepo: StubShareRepository;
  let resumeRepo: StubResumeReadRepository;

  const userId = 'user-123';
  const resumeId = 'resume-456';

  beforeEach(() => {
    shareRepo = new StubShareRepository();
    resumeRepo = new StubResumeReadRepository();
    useCase = new ListUserSharesUseCase(shareRepo, resumeRepo);
  });

  it('should return all shares for a resume owned by the user', async () => {
    const result = await useCase.execute(userId, resumeId);

    expect(result).toHaveLength(2);
    expect(shareRepo.findByResumeId).toHaveBeenCalledWith(resumeId);
  });

  it('should return an empty array when no shares exist', async () => {
    shareRepo.findByResumeId = mock(async () => []);

    const result = await useCase.execute(userId, resumeId);

    expect(result).toHaveLength(0);
  });

  it('should throw EntityNotFoundException when resume does not exist', async () => {
    resumeRepo.findById = mock(async () => null);

    await expect(useCase.execute(userId, resumeId)).rejects.toThrow(EntityNotFoundException);
  });

  it('should throw ForbiddenException when user does not own the resume', async () => {
    resumeRepo.findById = mock(async () => ({ id: resumeId, userId: 'other-user' }));

    await expect(useCase.execute(userId, resumeId)).rejects.toThrow(ForbiddenException);
  });

  it('should not call findByResumeId when resume is not found', async () => {
    resumeRepo.findById = mock(async () => null);

    await expect(useCase.execute(userId, resumeId)).rejects.toThrow();
    expect(shareRepo.findByResumeId).not.toHaveBeenCalled();
  });
});
