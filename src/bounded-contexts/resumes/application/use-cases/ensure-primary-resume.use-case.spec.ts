import { describe, expect, it } from 'bun:test';
import type { CreateResumeData, UpdateResumeData } from '@/shared-kernel';
import { type ResumeEntity, ResumesRepositoryPort } from '../../core/ports/resumes-repository.port';
import { PrimaryResumeRequiredException } from '../../domain/exceptions';
import { EnsurePrimaryResumeUseCase } from './ensure-primary-resume.use-case';

class StubRepo extends ResumesRepositoryPort {
  constructor(private readonly resumes: ResumeEntity[]) {
    super();
  }
  async listUserResumes(): Promise<ResumeEntity[]> {
    return this.resumes;
  }
  async listUserResumesPaginated(): Promise<ResumeEntity[]> {
    return this.resumes;
  }
  async findResumeByIdAndUserId(): Promise<ResumeEntity | null> {
    return null;
  }
  async findResumeByUserId(): Promise<ResumeEntity | null> {
    return null;
  }
  async countUserResumes(): Promise<number> {
    return this.resumes.length;
  }
  async createResumeForUser(_userId: string, _: CreateResumeData): Promise<ResumeEntity> {
    throw new Error('not used');
  }
  async createResumeForUserWithQuota(_userId: string, _: CreateResumeData): Promise<ResumeEntity> {
    throw new Error('not used');
  }
  async duplicateResumeForUserWithQuota(): Promise<ResumeEntity> {
    throw new Error('not used');
  }
  async updateResumeForUser(
    _id: string,
    _userId: string,
    _: UpdateResumeData,
  ): Promise<ResumeEntity | null> {
    return null;
  }
  async deleteResumeForUser(): Promise<boolean> {
    return false;
  }
}

const sample: ResumeEntity = {
  id: 'r1',
  userId: 'u1',
  title: 'Primary',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('EnsurePrimaryResumeUseCase', () => {
  it('resolves silently when the user has at least one resume', async () => {
    const useCase = new EnsurePrimaryResumeUseCase(new StubRepo([sample]));
    await expect(useCase.execute('u1')).resolves.toBeUndefined();
  });

  it('throws PrimaryResumeRequiredException when the user has no resumes', async () => {
    const useCase = new EnsurePrimaryResumeUseCase(new StubRepo([]));
    await expect(useCase.execute('u1')).rejects.toBeInstanceOf(PrimaryResumeRequiredException);
  });
});
