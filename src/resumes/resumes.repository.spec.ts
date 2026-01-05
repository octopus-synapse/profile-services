import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ResumesRepository } from './resumes.repository';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';

const mockPrismaService = {
  resume: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('ResumesRepository', () => {
  let repository: ResumesRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumesRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<ResumesRepository>(ResumesRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of resumes for a user', async () => {
      const userId = 'user1';
      const expectedResumes = [{ id: '1', userId, title: 'My Resume' }];
      mockPrismaService.resume.findMany.mockResolvedValue(expectedResumes);

      const result = await repository.findAll(userId);
      expect(result).toEqual(expectedResumes);
      expect(mockPrismaService.resume.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a single resume', async () => {
      const resumeId = '1';
      const userId = 'user1';
      const expectedResume = { id: resumeId, userId, title: 'My Resume' };
      mockPrismaService.resume.findFirst.mockResolvedValue(expectedResume);

      const result = await repository.findOne(resumeId, userId);
      expect(result).toEqual(expectedResume);
      expect(mockPrismaService.resume.findFirst).toHaveBeenCalledWith({
        where: { id: resumeId, userId },
        include: expect.any(Object),
      });
    });

    it('should return null if resume not found', async () => {
      const resumeId = '1';
      const userId = 'user1';
      mockPrismaService.resume.findFirst.mockResolvedValue(null);

      const result = await repository.findOne(resumeId, userId);
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create and return a new resume', async () => {
      const userId = 'user1';
      const createDto: CreateResumeDto = { title: 'New Resume' };
      const expectedResume = { id: '1', userId, ...createDto };
      mockPrismaService.resume.create.mockResolvedValue(expectedResume);

      const result = await repository.create(userId, createDto);
      expect(result).toEqual(expectedResume);
      expect(mockPrismaService.resume.create).toHaveBeenCalledWith({
        data: {
          userId,
          ...createDto,
        },
      });
    });
  });

  describe('update', () => {
    it('should update and return the resume if owner is correct', async () => {
      const resumeId = '1';
      const userId = 'user1';
      const updateDto: UpdateResumeDto = { title: 'Updated Title' };
      const existingResume = { id: resumeId, userId, title: 'Old Title' };
      const updatedResume = { ...existingResume, ...updateDto };

      // Mock the ownership check
      mockPrismaService.resume.findFirst.mockResolvedValue(existingResume);
      // Mock the update operation
      mockPrismaService.resume.update.mockResolvedValue(updatedResume);

      const result = await repository.update(resumeId, userId, updateDto);
      expect(result).toEqual(updatedResume);
      expect(mockPrismaService.resume.findFirst).toHaveBeenCalledWith({
        where: { id: resumeId, userId },
        include: expect.any(Object),
      });
      expect(mockPrismaService.resume.update).toHaveBeenCalledWith({
        where: { id: resumeId },
        data: updateDto,
      });
    });

    it('should throw ForbiddenException if resume is not found for the user', async () => {
      const resumeId = '1';
      const userId = 'user1';
      const updateDto: UpdateResumeDto = { title: 'Updated Title' };

      mockPrismaService.resume.findFirst.mockResolvedValue(null);

      await expect(
        repository.update(resumeId, userId, updateDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('should delete the resume and return true if owner is correct', async () => {
      const resumeId = '1';
      const userId = 'user1';
      const existingResume = { id: resumeId, userId, title: 'My Resume' };

      // Mock the ownership check
      mockPrismaService.resume.findFirst.mockResolvedValue(existingResume);
      // Mock the delete operation
      mockPrismaService.resume.delete.mockResolvedValue(existingResume);

      const result = await repository.delete(resumeId, userId);
      expect(result).toBe(true);
      expect(mockPrismaService.resume.findFirst).toHaveBeenCalledWith({
        where: { id: resumeId, userId },
        include: expect.any(Object),
      });
      expect(mockPrismaService.resume.delete).toHaveBeenCalledWith({
        where: { id: resumeId },
      });
    });

    it('should throw ForbiddenException if resume is not found for the user', async () => {
      const resumeId = '1';
      const userId = 'user1';

      mockPrismaService.resume.findFirst.mockResolvedValue(null);

      await expect(repository.delete(resumeId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findByUserId', () => {
    it('should return a resume for a given user id', async () => {
      const userId = 'user1';
      const expectedResume = { id: '1', userId, title: 'My Resume' };
      mockPrismaService.resume.findFirst.mockResolvedValue(expectedResume);

      const result = await repository.findByUserId(userId);
      expect(result).toEqual(expectedResume);
      expect(mockPrismaService.resume.findFirst).toHaveBeenCalledWith({
        where: { userId },
        include: expect.any(Object),
      });
    });
  });
});
