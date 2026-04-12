import { beforeEach, describe, expect, it, mock } from 'bun:test';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { EventPublisher } from '@/shared-kernel';
import type { ResumeReadRepositoryPort } from '../../domain/ports/resume-read.repository.port';
import type { ShareRepositoryPort } from '../../domain/ports/share.repository.port';
import { CreateShareUseCase } from './create-share.use-case';

describe('CreateShareUseCase', () => {
  let useCase: CreateShareUseCase;
  let shareRepo: Record<string, ReturnType<typeof mock>>;
  let resumeRepo: Record<string, ReturnType<typeof mock>>;
  let eventPublisher: Record<string, ReturnType<typeof mock>>;

  const userId = 'user-123';
  const resumeId = 'resume-456';

  beforeEach(() => {
    shareRepo = {
      findBySlugOnly: mock(() => Promise.resolve(null)),
      create: mock((data: unknown) =>
        Promise.resolve({
          id: 'share-1',
          ...(data as object),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
    };

    resumeRepo = {
      findById: mock(() => Promise.resolve({ id: resumeId, userId })),
    };

    eventPublisher = {
      publish: mock(() => {}),
    };

    useCase = new CreateShareUseCase(
      shareRepo as unknown as ShareRepositoryPort,
      resumeRepo as unknown as ResumeReadRepositoryPort,
      eventPublisher as unknown as EventPublisher,
    );
  });

  it('should create a share with a generated slug', async () => {
    const result = await useCase.execute(userId, { resumeId });

    expect(result).toBeDefined();
    expect(result.id).toBe('share-1');
    expect(shareRepo.create).toHaveBeenCalledTimes(1);
    expect(eventPublisher.publish).toHaveBeenCalledTimes(1);
  });

  it('should create a share with a custom slug', async () => {
    const result = await useCase.execute(userId, { resumeId, slug: 'my-custom-slug' });

    expect(result).toBeDefined();
    expect(shareRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'my-custom-slug' }),
    );
  });

  it('should hash the password when provided', async () => {
    const result = await useCase.execute(userId, { resumeId, password: 'secret123' });

    expect(result).toBeDefined();
    const createCall = shareRepo.create.mock.calls[0] as [{ password: string }];
    expect(createCall[0].password).not.toBe('secret123');
    expect(createCall[0].password).toBeDefined();
  });

  it('should pass null password when not provided', async () => {
    await useCase.execute(userId, { resumeId });

    const createCall = shareRepo.create.mock.calls[0] as [{ password: string | null }];
    expect(createCall[0].password).toBeNull();
  });

  it('should throw BadRequestException for invalid slug format', async () => {
    await expect(useCase.execute(userId, { resumeId, slug: 'invalid slug!@#' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw ConflictException when slug already exists', async () => {
    shareRepo.findBySlugOnly = mock(() => Promise.resolve({ id: 'existing', slug: 'taken-slug' }));

    await expect(useCase.execute(userId, { resumeId, slug: 'taken-slug' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('should throw NotFoundException when resume does not exist', async () => {
    resumeRepo.findById = mock(() => Promise.resolve(null));

    await expect(useCase.execute(userId, { resumeId })).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException when user does not own the resume', async () => {
    resumeRepo.findById = mock(() => Promise.resolve({ id: resumeId, userId: 'other-user' }));

    await expect(useCase.execute(userId, { resumeId })).rejects.toThrow(ForbiddenException);
  });

  it('should publish a ResumePublishedEvent on success', async () => {
    await useCase.execute(userId, { resumeId, slug: 'my-slug' });

    expect(eventPublisher.publish).toHaveBeenCalledTimes(1);
    const event = (eventPublisher.publish.mock.calls[0] as [{ eventType: string }])[0];
    expect(event.eventType).toBe('presentation.resume.published');
  });
});
