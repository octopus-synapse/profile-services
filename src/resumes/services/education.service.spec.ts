import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { EducationService } from './education.service';
import { EducationRepository } from '../repositories/education.repository';
import { ResumesRepository } from '../resumes.repository';
import { CreateEducationDto, UpdateEducationDto } from '../dto/education.dto';

describe('EducationService', () => {
  let service: EducationService;
  let educationRepository: EducationRepository;
  let resumesRepository: ResumesRepository;

  const mockResume = {
    id: 'resume-123',
    userId: 'user-123',
    title: 'Test Resume',
  };

  const mockEducation = {
    id: 'edu-123',
    resumeId: 'resume-123',
    institution: 'MIT',
    degree: 'Bachelor of Science',
    field: 'Computer Science',
    startDate: new Date('2018-09-01'),
    endDate: new Date('2022-05-31'),
    gpa: '3.9',
    location: 'Cambridge, MA',
    description: 'Focused on AI and ML',
    isCurrent: false,
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockEducationRepository = {
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
        EducationService,
        { provide: EducationRepository, useValue: mockEducationRepository },
        { provide: ResumesRepository, useValue: mockResumesRepository },
      ],
    }).compile();

    service = module.get(EducationService);
    educationRepository = module.get(EducationRepository);
    resumesRepository = module.get(ResumesRepository);

    spyOn(Logger.prototype, 'log').mockImplementation();
    spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  describe('listForResume', () => {
    it('should return paginated education entries', async () => {
      const paginatedResult = {
        data: [mockEducation],
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
      educationRepository.findAll.mockResolvedValue(paginatedResult);

      const result = await service.listForResume('resume-123', 'user-123');

      expect(result).toEqual(paginatedResult);
      expect(educationRepository.findAll).toHaveBeenCalledWith(
        'resume-123',
        1,
        20,
      );
    });
  });

  describe('getById', () => {
    it('should return single education entry', async () => {
      resumesRepository.findOne.mockResolvedValue(mockResume as any);
      educationRepository.findOne.mockResolvedValue(mockEducation);

      const result = await service.getById('resume-123', 'edu-123', 'user-123');

      expect(result.data).toEqual(mockEducation);
      expect(educationRepository.findOne).toHaveBeenCalledWith(
        'edu-123',
        'resume-123',
      );
    });

    it('should throw NotFoundException when not found', async () => {
      resumesRepository.findOne.mockResolvedValue(mockResume as any);
      educationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getById('resume-123', 'invalid-id', 'user-123'),
      ).rejects.toThrow('Education not found');
    });
  });

  describe('addToResume', () => {
    it('should create new education entry', async () => {
      const createDto: CreateEducationDto = {
        institution: 'Harvard',
        degree: 'Master of Science',
        field: 'Data Science',
        startDate: '2022-09-01',
      };

      resumesRepository.findOne.mockResolvedValue(mockResume as any);
      educationRepository.create.mockResolvedValue(mockEducation);

      const result = await service.addToResume(
        'resume-123',
        'user-123',
        createDto,
      );

      expect(result.data).toEqual(mockEducation);
      expect(educationRepository.create).toHaveBeenCalledWith(
        'resume-123',
        createDto,
      );
    });
  });

  describe('updateById', () => {
    it('should update existing education entry', async () => {
      const updateDto: UpdateEducationDto = {
        gpa: '4.0',
      };

      resumesRepository.findOne.mockResolvedValue(mockResume as any);
      educationRepository.update.mockResolvedValue({
        ...mockEducation,
        gpa: updateDto.gpa!,
      } as any);

      const result = await service.updateById(
        'resume-123',
        'edu-123',
        'user-123',
        updateDto,
      );

      expect(result.data!.gpa).toBe(updateDto.gpa);
      expect(educationRepository.update).toHaveBeenCalledWith(
        'edu-123',
        'resume-123',
        updateDto,
      );
    });
  });

  describe('deleteById', () => {
    it('should delete education entry successfully', async () => {
      resumesRepository.findOne.mockResolvedValue(mockResume as any);
      educationRepository.delete.mockResolvedValue(true);

      const result = await service.deleteById(
        'resume-123',
        'edu-123',
        'user-123',
      );

      expect(result.message).toBe('Education deleted successfully');
      expect(educationRepository.delete).toHaveBeenCalledWith(
        'edu-123',
        'resume-123',
      );
    });
  });

  describe('reorder', () => {
    it('should reorder education entries with custom message', async () => {
      resumesRepository.findOne.mockResolvedValue(mockResume as any);
      educationRepository.reorder.mockResolvedValue();

      const result = await service.reorder('resume-123', 'user-123', [
        'edu-1',
        'edu-2',
      ]);

      expect(result.message).toBe('Education entries reordered successfully');
      expect(educationRepository.reorder).toHaveBeenCalledWith('resume-123', [
        'edu-1',
        'edu-2',
      ]);
    });
  });
});
