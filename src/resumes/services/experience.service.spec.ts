import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ExperienceService } from './experience.service';
import { ExperienceRepository } from '../repositories/experience.repository';
import { ResumesRepository } from '../resumes.repository';
import {
  CreateExperienceDto,
  UpdateExperienceDto,
} from '../dto/experience.dto';

describe('ExperienceService', () => {
  let service: ExperienceService;
  let experienceRepository: ExperienceRepository;
  let resumesRepository: ResumesRepository;

  const mockResume = {
    id: 'resume-123',
    userId: 'user-123',
    title: 'Test Resume',
  };

  const mockExperience = {
    id: 'exp-123',
    resumeId: 'resume-123',
    company: 'Tech Corp',
    position: 'Senior Developer',
    location: 'Remote',
    startDate: new Date('2022-01-01'),
    endDate: new Date('2023-12-31'),
    description: 'Led development of key features',
    skills: ['TypeScript', 'React'],
    isCurrent: false,
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockExperienceRepository = {
      findAll: mock(),
      findOne: mock(),
      create: mock(),
      update: mock(),
      delete: mock(),
      reorder: mock(),
    };

    const mockResumesRepository = {
      findOne: mock(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExperienceService,
        { provide: ExperienceRepository, useValue: mockExperienceRepository },
        { provide: ResumesRepository, useValue: mockResumesRepository },
      ],
    }).compile();

    service = module.get(ExperienceService);
    experienceRepository = module.get(ExperienceRepository);
    resumesRepository = module.get(ResumesRepository);

    spyOn(Logger.prototype, 'log').mockImplementation();
    spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  describe('listForResume', () => {
    it('should return paginated experiences', async () => {
      const paginatedResult = {
        data: [mockExperience],
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };

      resumesRepository.findOne.mockResolvedValue(mockResume as any);
      experienceRepository.findAll.mockResolvedValue(paginatedResult);

      const result = await service.listForResume('resume-123', 'user-123');

      expect(result).toEqual(paginatedResult);
      expect(experienceRepository.findAll).toHaveBeenCalledWith(
        'resume-123',
        1,
        20,
      );
    });
  });

  describe('getById', () => {
    it('should return single experience', async () => {
      resumesRepository.findOne.mockResolvedValue(mockResume as any);
      experienceRepository.findOne.mockResolvedValue(mockExperience);

      const result = await service.getById('resume-123', 'exp-123', 'user-123');

      expect(result.data).toEqual(mockExperience);
      expect(experienceRepository.findOne).toHaveBeenCalledWith(
        'exp-123',
        'resume-123',
      );
    });

    it('should throw NotFoundException when not found', async () => {
      resumesRepository.findOne.mockResolvedValue(mockResume as any);
      experienceRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getById('resume-123', 'invalid-id', 'user-123'),
      ).rejects.toThrow('Experience not found');
    });
  });

  describe('addToResume', () => {
    it('should create new experience', async () => {
      const createDto: CreateExperienceDto = {
        company: 'New Company',
        position: 'Developer',
        startDate: '2023-01-01',
      };

      resumesRepository.findOne.mockResolvedValue(mockResume as any);
      experienceRepository.create.mockResolvedValue(mockExperience);

      const result = await service.addToResume(
        'resume-123',
        'user-123',
        createDto,
      );

      expect(result.data).toEqual(mockExperience);
      expect(experienceRepository.create).toHaveBeenCalledWith(
        'resume-123',
        createDto,
      );
    });
  });

  describe('updateById', () => {
    it('should update existing experience', async () => {
      const updateDto: UpdateExperienceDto = {
        position: 'Lead Developer',
      };

      resumesRepository.findOne.mockResolvedValue(mockResume as any);
      experienceRepository.update.mockResolvedValue({
        ...mockExperience,
        position: updateDto.position!,
      } as any);

      const result = await service.updateById(
        'resume-123',
        'exp-123',
        'user-123',
        updateDto,
      );

      expect(result.data!.position).toBe(updateDto.position);
      expect(experienceRepository.update).toHaveBeenCalledWith(
        'exp-123',
        'resume-123',
        updateDto,
      );
    });

    it('should throw NotFoundException when not found', async () => {
      resumesRepository.findOne.mockResolvedValue(mockResume as any);
      experienceRepository.update.mockResolvedValue(null);

      await expect(
        service.updateById('resume-123', 'invalid-id', 'user-123', {}),
      ).rejects.toThrow('Experience not found');
    });
  });

  describe('deleteById', () => {
    it('should delete experience successfully', async () => {
      resumesRepository.findOne.mockResolvedValue(mockResume as any);
      experienceRepository.delete.mockResolvedValue(true);

      const result = await service.deleteById(
        'resume-123',
        'exp-123',
        'user-123',
      );

      expect(result.message).toBe('Experience deleted successfully');
      expect(experienceRepository.delete).toHaveBeenCalledWith(
        'exp-123',
        'resume-123',
      );
    });

    it('should throw NotFoundException when not found', async () => {
      resumesRepository.findOne.mockResolvedValue(mockResume as any);
      experienceRepository.delete.mockResolvedValue(false);

      await expect(
        service.deleteById('resume-123', 'invalid-id', 'user-123'),
      ).rejects.toThrow('Experience not found');
    });
  });
});
