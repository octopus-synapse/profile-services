import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { ShareRepositoryPort } from '../../domain/ports/share.repository.port';
import { DeleteShareUseCase } from './delete-share.use-case';

describe('DeleteShareUseCase', () => {
  let useCase: DeleteShareUseCase;
  let shareRepo: Record<string, ReturnType<typeof mock>>;

  const userId = 'user-123';
  const shareId = 'share-456';

  beforeEach(() => {
    shareRepo = {
      findByIdWithResume: mock(() =>
        Promise.resolve({
          id: shareId,
          resumeId: 'resume-1',
          slug: 'test-slug',
          password: null,
          expiresAt: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          resume: { userId },
        }),
      ),
      delete: mock(() =>
        Promise.resolve({
          id: shareId,
          resumeId: 'resume-1',
          slug: 'test-slug',
          password: null,
          expiresAt: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
    };

    useCase = new DeleteShareUseCase(shareRepo as unknown as ShareRepositoryPort);
  });

  it('should delete a share when the user owns it', async () => {
    const result = await useCase.execute(userId, shareId);

    expect(result).toBeDefined();
    expect(result.id).toBe(shareId);
    expect(shareRepo.findByIdWithResume).toHaveBeenCalledWith(shareId);
    expect(shareRepo.delete).toHaveBeenCalledWith(shareId);
  });

  it('should throw NotFoundException when share does not exist', async () => {
    shareRepo.findByIdWithResume = mock(() => Promise.resolve(null));

    await expect(useCase.execute(userId, shareId)).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException when user does not own the share', async () => {
    shareRepo.findByIdWithResume = mock(() =>
      Promise.resolve({
        id: shareId,
        resumeId: 'resume-1',
        slug: 'test-slug',
        password: null,
        expiresAt: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        resume: { userId: 'other-user' },
      }),
    );

    await expect(useCase.execute(userId, shareId)).rejects.toThrow(ForbiddenException);
  });

  it('should not call delete when share is not found', async () => {
    shareRepo.findByIdWithResume = mock(() => Promise.resolve(null));

    await expect(useCase.execute(userId, shareId)).rejects.toThrow();
    expect(shareRepo.delete).not.toHaveBeenCalled();
  });
});
