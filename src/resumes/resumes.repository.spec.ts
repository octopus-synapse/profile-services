/**
 * ResumesRepository Tests
 *
 * NOTA (Uncle Bob): Repository é a borda com a persistência.
 * Testes focam em comportamento observável:
 * - Dados retornados
 * - Exceções lançadas
 * - Efeitos de persistência (via stubs que simulam estado)
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ResumesRepository } from './resumes.repository';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';

describe('ResumesRepository', () => {
  let repository: ResumesRepository;

  // In-memory store para simular o banco
  const dataStore = new Map<
    string,
    { id: string; userId: string; title: string; updatedAt: Date }
  >();
  let idCounter = 1;

  const createFakePrismaService = () => ({
    resume: {
      findMany: mock(({ where }: { where: { userId: string } }) => {
        const resumes = Array.from(dataStore.values())
          .filter((r) => r.userId === where.userId)
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        return Promise.resolve(resumes);
      }),
      findFirst: mock(
        ({ where }: { where: { id?: string; userId: string } }) => {
          if (where.id) {
            const resume = dataStore.get(where.id);
            if (resume && resume.userId === where.userId) {
              return Promise.resolve(resume);
            }
            return Promise.resolve(null);
          }
          // findByUserId case
          const resume = Array.from(dataStore.values()).find(
            (r) => r.userId === where.userId,
          );
          return Promise.resolve(resume ?? null);
        },
      ),
      create: mock(
        ({
          data,
        }: {
          data: { userId: string; title: string; summary?: string };
        }) => {
          const newResume = {
            id: `resume-${idCounter++}`,
            ...data,
            updatedAt: new Date(),
          };
          dataStore.set(newResume.id, newResume);
          return Promise.resolve(newResume);
        },
      ),
      update: mock(
        ({ where, data }: { where: { id: string }; data: UpdateResumeDto }) => {
          const resume = dataStore.get(where.id);
          if (!resume) return Promise.resolve(null);
          const updated = { ...resume, ...data, updatedAt: new Date() };
          dataStore.set(where.id, updated);
          return Promise.resolve(updated);
        },
      ),
      delete: mock(({ where }: { where: { id: string } }) => {
        const resume = dataStore.get(where.id);
        if (resume) {
          dataStore.delete(where.id);
          return Promise.resolve(resume);
        }
        return Promise.resolve(null);
      }),
    },
  });

  let fakePrisma: ReturnType<typeof createFakePrismaService>;

  beforeEach(async () => {
    dataStore.clear();
    idCounter = 1;
    fakePrisma = createFakePrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumesRepository,
        { provide: PrismaService, useValue: fakePrisma },
      ],
    }).compile();

    repository = module.get<ResumesRepository>(ResumesRepository);
  });

  describe('findAll', () => {
    it('should return empty array when user has no resumes', async () => {
      const result = await repository.findAll('user-1');

      expect(result).toEqual([]);
    });

    it('should return all resumes for the user', async () => {
      // Setup: create resumes for multiple users
      dataStore.set('r1', {
        id: 'r1',
        userId: 'user-1',
        title: 'Resume A',
        updatedAt: new Date(),
      });
      dataStore.set('r2', {
        id: 'r2',
        userId: 'user-1',
        title: 'Resume B',
        updatedAt: new Date(),
      });
      dataStore.set('r3', {
        id: 'r3',
        userId: 'user-2',
        title: 'Other User',
        updatedAt: new Date(),
      });

      const result = await repository.findAll('user-1');

      expect(result).toHaveLength(2);
      expect(result.every((r) => r.userId === 'user-1')).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return resume when it exists and belongs to user', async () => {
      dataStore.set('r1', {
        id: 'r1',
        userId: 'user-1',
        title: 'My Resume',
        updatedAt: new Date(),
      });

      const result = await repository.findOne('r1', 'user-1');

      expect(result).toMatchObject({
        id: 'r1',
        userId: 'user-1',
        title: 'My Resume',
      });
    });

    it('should return null when resume does not exist', async () => {
      const result = await repository.findOne('non-existent', 'user-1');

      expect(result).toBeNull();
    });

    it('should return null when resume belongs to another user', async () => {
      dataStore.set('r1', {
        id: 'r1',
        userId: 'user-1',
        title: 'My Resume',
        updatedAt: new Date(),
      });

      const result = await repository.findOne('r1', 'user-2');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create resume and return it with generated id', async () => {
      const createDto: CreateResumeDto = { title: 'New Resume' };

      const result = await repository.create('user-1', createDto);

      expect(result).toMatchObject({
        id: expect.any(String),
        userId: 'user-1',
        title: 'New Resume',
      });
    });

    it('should persist resume to storage', async () => {
      await repository.create('user-1', { title: 'Persisted Resume' });

      const allResumes = await repository.findAll('user-1');

      expect(allResumes).toHaveLength(1);
      expect(allResumes[0].title).toBe('Persisted Resume');
    });
  });

  describe('update', () => {
    it('should update resume when user owns it', async () => {
      dataStore.set('r1', {
        id: 'r1',
        userId: 'user-1',
        title: 'Original',
        updatedAt: new Date(),
      });

      const result = await repository.update('r1', 'user-1', {
        title: 'Updated',
      });

      expect(result).toMatchObject({
        id: 'r1',
        title: 'Updated',
      });
    });

    it('should throw ForbiddenException when resume does not exist', async () => {
      await expect(
        repository.update('non-existent', 'user-1', { title: 'New' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user does not own resume', async () => {
      dataStore.set('r1', {
        id: 'r1',
        userId: 'user-1',
        title: 'Original',
        updatedAt: new Date(),
      });

      await expect(
        repository.update('r1', 'user-2', { title: 'Stolen' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('should delete resume and return true when user owns it', async () => {
      dataStore.set('r1', {
        id: 'r1',
        userId: 'user-1',
        title: 'To Delete',
        updatedAt: new Date(),
      });

      const result = await repository.delete('r1', 'user-1');

      expect(result).toBe(true);
      expect(dataStore.has('r1')).toBe(false);
    });

    it('should throw ForbiddenException when resume does not exist', async () => {
      await expect(
        async () => await repository.delete('non-existent', 'user-1'),
      ).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user does not own resume', async () => {
      dataStore.set('r1', {
        id: 'r1',
        userId: 'user-1',
        title: 'My Resume',
        updatedAt: new Date(),
      });

      await expect(async () => await repository.delete('r1', 'user-2')).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findByUserId', () => {
    it('should return null when user has no resume', async () => {
      const result = await repository.findByUserId('user-without-resume');

      expect(result).toBeNull();
    });

    it('should return first resume for user', async () => {
      dataStore.set('r1', {
        id: 'r1',
        userId: 'user-1',
        title: 'User Resume',
        updatedAt: new Date(),
      });

      const result = await repository.findByUserId('user-1');

      expect(result).toMatchObject({
        id: 'r1',
        userId: 'user-1',
        title: 'User Resume',
      });
    });
  });
});
