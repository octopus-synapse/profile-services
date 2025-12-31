import { Test, TestingModule } from '@nestjs/testing';
import { ResumesService } from './resumes.service';
import { ResumesRepository } from './resumes.repository';
import { NotFoundException } from '@nestjs/common';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';

const mockResumesRepository = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByUserId: jest.fn(),
};

describe('ResumesService', () => {
  let service: ResumesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumesService,
        {
          provide: ResumesRepository,
          useValue: mockResumesRepository,
        },
      ],
    }).compile();

    service = module.get<ResumesService>(ResumesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of resumes', async () => {
      const userId = 'user1';
      const expectedResumes = [{ id: '1', title: 'Resume 1' }];
      mockResumesRepository.findAll.mockResolvedValue(expectedResumes);

      const result = await service.findAll(userId);
      expect(result).toEqual(expectedResumes);
      expect(mockResumesRepository.findAll).toHaveBeenCalledWith(userId);
    });
  });

  describe('findOne', () => {
    it('should return a single resume', async () => {
      const resumeId = '1';
      const userId = 'user1';
      const expectedResume = { id: resumeId, title: 'Resume 1' };
      mockResumesRepository.findOne.mockResolvedValue(expectedResume);

      const result = await service.findOne(resumeId, userId);
      expect(result).toEqual(expectedResume);
      expect(mockResumesRepository.findOne).toHaveBeenCalledWith(
        resumeId,
        userId,
      );
    });

    it('should throw a NotFoundException if resume is not found', async () => {
      const resumeId = '1';
      const userId = 'user1';
      mockResumesRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(resumeId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create and return a new resume', async () => {
      const userId = 'user1';
      const createResumeDto: CreateResumeDto = {
        title: 'New Resume',
        summary: 'A new resume',
      };
      const expectedResume = { id: '1', ...createResumeDto };
      mockResumesRepository.create.mockResolvedValue(expectedResume);

      const result = await service.create(userId, createResumeDto);
      expect(result).toEqual(expectedResume);
      expect(mockResumesRepository.create).toHaveBeenCalledWith(
        userId,
        createResumeDto,
      );
    });
  });

  describe('update', () => {
    it('should update and return the resume', async () => {
      const resumeId = '1';
      const userId = 'user1';
      const updateResumeDto: UpdateResumeDto = { title: 'Updated Resume' };
      const updatedResume = { id: resumeId, ...updateResumeDto };
      mockResumesRepository.update.mockResolvedValue(updatedResume);

      const result = await service.update(resumeId, userId, updateResumeDto);
      expect(result).toEqual(updatedResume);
      expect(mockResumesRepository.update).toHaveBeenCalledWith(
        resumeId,
        userId,
        updateResumeDto,
      );
    });

    it('should throw a NotFoundException if resume to update is not found', async () => {
      const resumeId = '1';
      const userId = 'user1';
      const updateResumeDto: UpdateResumeDto = { title: 'Updated Resume' };
      mockResumesRepository.update.mockResolvedValue(null);

      await expect(
        service.update(resumeId, userId, updateResumeDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a resume and return a success message', async () => {
      const resumeId = '1';
      const userId = 'user1';
      mockResumesRepository.delete.mockResolvedValue(true);

      const result = await service.remove(resumeId, userId);
      expect(result).toEqual({
        success: true,
        message: 'Resume deleted successfully',
      });
      expect(mockResumesRepository.delete).toHaveBeenCalledWith(
        resumeId,
        userId,
      );
    });

    it('should throw a NotFoundException if resume to delete is not found', async () => {
      const resumeId = '1';
      const userId = 'user1';
      mockResumesRepository.delete.mockResolvedValue(false);

      await expect(service.remove(resumeId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByUserId', () => {
    it('should return a resume for a given user id', async () => {
      const userId = 'user1';
      const expectedResume = { id: '1', title: 'Resume 1' };
      mockResumesRepository.findByUserId.mockResolvedValue(expectedResume);

      const result = await service.findByUserId(userId);
      expect(result).toEqual(expectedResume);
      expect(mockResumesRepository.findByUserId).toHaveBeenCalledWith(userId);
    });
  });
});
