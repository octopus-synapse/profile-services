import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { ResumeReadRepositoryPort } from '../../domain/ports/resume-read.repository.port';
import type { ShareRepositoryPort } from '../../domain/ports/share.repository.port';
import { ListUserSharesUseCase } from './list-user-shares.use-case';

describe('ListUserSharesUseCase', () => {
  let useCase: ListUserSharesUseCase;
  let shareRepo: Record<string, ReturnType<typeof mock>>;
  let resumeRepo: Record<string, ReturnType<typeof mock>>;

  const userId = 'user-123';
  const resumeId = 'resume-456';

  beforeEach(() => {
    shareRepo = {
      findByResumeId: mock(() =>
        Promise.resolve([
          {
            id: 'share-1',
            resumeId,
            slug: 'slug-1',
            password: null,
            expiresAt: null,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'share-2',
            resumeId,
            slug: 'slug-2',
            password: null,
            expiresAt: null,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      ),
    };

    resumeRepo = {
      findById: mock(() => Promise.resolve({ id: resumeId, userId })),
    };

    useCase = new ListUserSharesUseCase(
      shareRepo as unknown as ShareRepositoryPort,
      resumeRepo as unknown as ResumeReadRepositoryPort,
    );
  });

  it('should return all shares for a resume owned by the user', async () => {
    const result = await useCase.execute(userId, resumeId);

    expect(result).toHaveLength(2);
    expect(shareRepo.findByResumeId).toHaveBeenCalledWith(resumeId);
  });

  it('should return an empty array when no shares exist', async () => {
    shareRepo.findByResumeId = mock(() => Promise.resolve([]));

    const result = await useCase.execute(userId, resumeId);

    expect(result).toHaveLength(0);
  });

  it('should throw NotFoundException when resume does not exist', async () => {
    resumeRepo.findById = mock(() => Promise.resolve(null));

    await expect(useCase.execute(userId, resumeId)).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException when user does not own the resume', async () => {
    resumeRepo.findById = mock(() =>
      Promise.resolve({ id: resumeId, userId: 'other-user' }),
    );

    await expect(useCase.execute(userId, resumeId)).rejects.toThrow(ForbiddenException);
  });

  it('should not call findByResumeId when resume is not found', async () => {
    resumeRepo.findById = mock(() => Promise.resolve(null));

    await expect(useCase.execute(userId, resumeId)).rejects.toThrow();
    expect(shareRepo.findByResumeId).not.toHaveBeenCalled();
  });
});
