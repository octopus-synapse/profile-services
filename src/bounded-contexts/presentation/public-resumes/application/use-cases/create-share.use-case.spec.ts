import { beforeEach, describe, expect, it, mock } from 'bun:test';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ResumeReadRepositoryPort } from '../../domain/ports/resume-read.repository.port';
import {
  ShareRepositoryPort,
  type ShareEntity,
  type ShareWithResume,
} from '../../domain/ports/share.repository.port';
import { CreateShareUseCase } from './create-share.use-case';

class StubShareRepository implements ShareRepositoryPort {
  findBySlugOnly = mock(async (_slug: string): Promise<ShareEntity | null> => null);
  create = mock(
    async (data: {
      resumeId: string;
      slug: string;
      password: string | null;
      expiresAt: Date | null;
    }): Promise<ShareEntity> => ({
      id: 'share-1',
      ...data,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  );
  async findBySlug(_slug: string): Promise<ShareWithResume | null> {
    throw new Error('not used in test');
  }
  async findByIdWithResume(
    _id: string,
  ): Promise<(ShareEntity & { resume: { userId: string } }) | null> {
    throw new Error('not used in test');
  }
  async findByResumeId(_resumeId: string): Promise<ShareEntity[]> {
    throw new Error('not used in test');
  }
  async delete(_id: string): Promise<ShareEntity> {
    throw new Error('not used in test');
  }
}

type ResumeRecord = { id: string; userId: string };
type ResumeWithSections = Awaited<
  ReturnType<ResumeReadRepositoryPort['findByIdWithSections']>
>;

class StubResumeReadRepository implements ResumeReadRepositoryPort {
  findById = mock(async (_id: string): Promise<ResumeRecord | null> => ({
    id: 'resume-456',
    userId: 'user-123',
  }));
  async findByIdWithSections(_id: string): Promise<ResumeWithSections> {
    throw new Error('not used in test');
  }
}

describe('CreateShareUseCase', () => {
  let useCase: CreateShareUseCase;
  let shareRepo: StubShareRepository;
  let resumeRepo: StubResumeReadRepository;
  let eventPublisher: {
    publish: ReturnType<typeof mock>;
    publishAsync: ReturnType<typeof mock>;
  };

  const userId = 'user-123';
  const resumeId = 'resume-456';

  beforeEach(() => {
    shareRepo = new StubShareRepository();
    resumeRepo = new StubResumeReadRepository();
    eventPublisher = {
      publish: mock(() => {}),
      publishAsync: mock(async () => {}),
    };

    useCase = new CreateShareUseCase(shareRepo, resumeRepo, eventPublisher);
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
    shareRepo.findBySlugOnly = mock(async () => ({
      id: 'existing',
      resumeId,
      slug: 'taken-slug',
      password: null,
      expiresAt: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await expect(useCase.execute(userId, { resumeId, slug: 'taken-slug' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('should throw NotFoundException when resume does not exist', async () => {
    resumeRepo.findById = mock(async () => null);

    await expect(useCase.execute(userId, { resumeId })).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException when user does not own the resume', async () => {
    resumeRepo.findById = mock(async () => ({ id: resumeId, userId: 'other-user' }));

    await expect(useCase.execute(userId, { resumeId })).rejects.toThrow(ForbiddenException);
  });

  it('should publish a ResumePublishedEvent on success', async () => {
    await useCase.execute(userId, { resumeId, slug: 'my-slug' });

    expect(eventPublisher.publish).toHaveBeenCalledTimes(1);
    const event = (eventPublisher.publish.mock.calls[0] as [{ eventType: string }])[0];
    expect(event.eventType).toBe('presentation.resume.published');
  });
});
