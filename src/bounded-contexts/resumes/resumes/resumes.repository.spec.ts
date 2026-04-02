/**
 * ResumesRepository Tests
 *
 * NOTA (Uncle Bob): Repository é a borda com a persistência.
 * Testes focam em comportamento observável:
 * - Dados retornados
 * - Exceções lançadas
 * - Efeitos de persistência (via in-memory repository)
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { CreateResume, UpdateResume } from '@/shared-kernel';
import { ResumesRepository } from './resumes.repository';

class InMemoryResumesStore {
  private resumes = new Map<
    string,
    { id: string; userId: string; title: string; summary?: string; updatedAt: Date }
  >();
  private idCounter = 1;

  findMany({ where }: { where: { userId: string } }) {
    const resumes = Array.from(this.resumes.values())
      .filter((r) => r.userId === where.userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return Promise.resolve(resumes);
  }

  findFirst({ where }: { where: { id?: string; userId: string } }) {
    if (where.id) {
      const resume = this.resumes.get(where.id);
      if (resume && resume.userId === where.userId) {
        return Promise.resolve(resume);
      }
      return Promise.resolve(null);
    }
    const resume = Array.from(this.resumes.values()).find((r) => r.userId === where.userId);
    return Promise.resolve(resume ?? null);
  }

  create({ data }: { data: { userId: string; title: string; summary?: string } }) {
    const newResume = {
      id: `resume-${this.idCounter++}`,
      ...data,
      updatedAt: new Date(),
    };
    this.resumes.set(newResume.id, newResume);
    return Promise.resolve(newResume);
  }

  update({ where, data }: { where: { id: string }; data: UpdateResume }) {
    const resume = this.resumes.get(where.id);
    if (!resume) return Promise.resolve(null);
    const updated = { ...resume, ...data, updatedAt: new Date() };
    this.resumes.set(where.id, updated);
    return Promise.resolve(updated);
  }

  delete({ where }: { where: { id: string } }) {
    const resume = this.resumes.get(where.id);
    if (resume) {
      this.resumes.delete(where.id);
      return Promise.resolve(resume);
    }
    return Promise.resolve(null);
  }

  deleteMany({ where }: { where: { id: string; userId: string } }) {
    const resume = this.resumes.get(where.id);
    if (resume && resume.userId === where.userId) {
      this.resumes.delete(where.id);
      return Promise.resolve({ count: 1 });
    }
    return Promise.resolve({ count: 0 });
  }

  findUnique({ where }: { where: { id: string } }) {
    const resume = this.resumes.get(where.id);
    return Promise.resolve(resume ?? null);
  }

  seed(resume: { id: string; userId: string; title: string; updatedAt?: Date }): void {
    this.resumes.set(resume.id, {
      ...resume,
      updatedAt: resume.updatedAt ?? new Date(),
    });
  }

  clear(): void {
    this.resumes.clear();
    this.idCounter = 1;
  }
}

describe('ResumesRepository', () => {
  let repository: ResumesRepository;
  let store: InMemoryResumesStore;

  beforeEach(async () => {
    store = new InMemoryResumesStore();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumesRepository,
        {
          provide: PrismaService,
          useValue: { resume: store },
        },
      ],
    }).compile();

    repository = module.get<ResumesRepository>(ResumesRepository);
  });

  describe('findAll', () => {
    it('should return empty array when user has no resumes', async () => {
      const result = await repository.findAllUserResumes('user-1');

      expect(result).toEqual([]);
    });

    it('should return all resumes for the user', async () => {
      store.seed({
        id: 'r1',
        userId: 'user-1',
        title: 'Resume A',
      });
      store.seed({
        id: 'r2',
        userId: 'user-1',
        title: 'Resume B',
      });
      store.seed({
        id: 'r3',
        userId: 'user-2',
        title: 'Other User',
      });

      const result = await repository.findAllUserResumes('user-1');

      expect(result).toHaveLength(2);
      expect(result.every((r) => r.userId === 'user-1')).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return resume when it exists and belongs to user', async () => {
      store.seed({
        id: 'r1',
        userId: 'user-1',
        title: 'My Resume',
      });

      const result = await repository.findResumeByIdAndUserId('r1', 'user-1');

      expect(result).toMatchObject({
        id: 'r1',
        userId: 'user-1',
        title: 'My Resume',
      });
    });

    it('should return null when resume does not exist', async () => {
      const result = await repository.findResumeByIdAndUserId('non-existent', 'user-1');

      expect(result).toBeNull();
    });

    it('should return null when resume belongs to another user', async () => {
      store.seed({
        id: 'r1',
        userId: 'user-1',
        title: 'My Resume',
      });

      const result = await repository.findResumeByIdAndUserId('r1', 'user-2');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create resume and return it with generated id', async () => {
      const createDto: CreateResume = {
        title: 'New Resume',
        template: 'PROFESSIONAL',
        isPublic: false,
      };

      const result = await repository.createResumeForUser('user-1', createDto);

      expect(result).toMatchObject({
        id: expect.any(String),
        userId: 'user-1',
        title: 'New Resume',
      });
    });

    it('should persist resume to storage', async () => {
      await repository.createResumeForUser('user-1', {
        title: 'Persisted Resume',
        template: 'PROFESSIONAL',
        isPublic: false,
      });

      const allResumes = await repository.findAllUserResumes('user-1');

      expect(allResumes).toHaveLength(1);
      expect(allResumes[0].title).toBe('Persisted Resume');
    });
  });

  describe('update', () => {
    it('should update resume when user owns it', async () => {
      store.seed({
        id: 'r1',
        userId: 'user-1',
        title: 'Original',
      });

      const result = await repository.updateResumeForUser('r1', 'user-1', {
        title: 'Updated',
      });

      expect(result).toMatchObject({
        id: 'r1',
        title: 'Updated',
      });
    });

    it('should throw ForbiddenException when resume does not exist', async () => {
      await expect(
        repository.updateResumeForUser('non-existent', 'user-1', {
          title: 'New',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user does not own resume', async () => {
      store.seed({
        id: 'r1',
        userId: 'user-1',
        title: 'Original',
      });

      await expect(
        repository.updateResumeForUser('r1', 'user-2', { title: 'Stolen' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('should delete resume and return true when user owns it', async () => {
      store.seed({
        id: 'r1',
        userId: 'user-1',
        title: 'To Delete',
      });

      const result = await repository.deleteResumeForUser('r1', 'user-1');

      expect(result).toBe(true);
    });

    it('should throw NotFoundException when resume does not exist', async () => {
      await expect(
        async () => await repository.deleteResumeForUser('non-existent', 'user-1'),
      ).toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own resume', async () => {
      store.seed({
        id: 'r1',
        userId: 'user-1',
        title: 'My Resume',
      });

      await expect(async () => await repository.deleteResumeForUser('r1', 'user-2')).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findByUserId', () => {
    it('should return null when user has no resume', async () => {
      const result = await repository.findResumeByUserId('user-without-resume');

      expect(result).toBeNull();
    });

    it('should return first resume for user', async () => {
      store.seed({
        id: 'r1',
        userId: 'user-1',
        title: 'User Resume',
      });

      const result = await repository.findResumeByUserId('user-1');

      expect(result).toMatchObject({
        id: 'r1',
        userId: 'user-1',
        title: 'User Resume',
      });
    });
  });
});
