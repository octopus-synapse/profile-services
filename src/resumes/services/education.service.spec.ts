import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test';
import { createMockResume } from '../../../test/factories/resume.factory';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ResourceNotFoundError } from '@octopus-synapse/profile-contracts';
import { EducationService } from './education.service';
import { EducationRepository } from '../repositories/education.repository';
import { ResumesRepository } from '../resumes.repository';
import { CreateEducationDto, UpdateEducationDto } from '../dto';

describe('EducationService', () => {
  let service: EducationService;
  let educationRepository: EducationRepository;
  let resumesRepository: ResumesRepository;

  const mockResume = createMockResume({ id: 'resume-123', userId: 'user-123' });

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
      findAllEntitiesForResume: mock(),
      findEntityByIdAndResumeId: mock(),
      createEntityForResume: mock(),
      updateEntityForResume: mock(),
      deleteEntityForResume: mock(),
      reorderEntitiesForResume: mock(),
    };

    const mockResumesRepository = {
      findResumeByIdAndUserId: mock(),
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

  describe('listAllEntitiesForResume', () => {
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

      resumesRepository.findResumeByIdAndUserId.mockResolvedValue(
        mockResume as any,
      );
      educationRepository.findAllEntitiesForResume.mockResolvedValue(
        paginatedResult,
      );

      const result = await service.listAllEntitiesForResume(
        'resume-123',
        'user-123',
      );

      expect(result).toEqual(paginatedResult);
      expect(educationRepository.findAllEntitiesForResume).toHaveBeenCalledWith(
        'resume-123',
        1,
        20,
      );
    });
  });

  describe('getById', () => {
    it('should return single education entry', async () => {
      resumesRepository.findResumeByIdAndUserId.mockResolvedValue(
        mockResume as any,
      );
      educationRepository.findEntityByIdAndResumeId.mockResolvedValue(
        mockEducation,
      );

      const result = await service.getEntityByIdForResume(
        'resume-123',
        'edu-123',
        'user-123',
      );

      expect(result.data).toEqual(mockEducation);
      expect(
        educationRepository.findEntityByIdAndResumeId,
      ).toHaveBeenCalledWith('edu-123', 'resume-123');
    });

    it('should throw ResourceNotFoundError when not found', async () => {
      resumesRepository.findResumeByIdAndUserId.mockResolvedValue(
        mockResume as any,
      );
      educationRepository.findEntityByIdAndResumeId.mockResolvedValue(null);

      await expect(
        service.getEntityByIdForResume('resume-123', 'invalid-id', 'user-123'),
      ).rejects.toThrow(ResourceNotFoundError);
    });
  });

  describe('addEntityToResume', () => {
    it('should create new education entry', async () => {
      const createDto: CreateEducationDto = {
        institution: 'Harvard',
        degree: 'Master of Science',
        field: 'Data Science',
        startDate: '2022-09-01',
      };

      resumesRepository.findResumeByIdAndUserId.mockResolvedValue(
        mockResume as any,
      );
      educationRepository.createEntityForResume.mockResolvedValue(
        mockEducation,
      );

      const result = await service.addEntityToResume(
        'resume-123',
        'user-123',
        createDto,
      );

      expect(result.data).toEqual(mockEducation);
      expect(educationRepository.createEntityForResume).toHaveBeenCalledWith(
        'resume-123',
        createDto,
      );
    });
  });

  describe('updateEntityByIdForResume', () => {
    it('should update existing education entry', async () => {
      const updateDto: UpdateEducationDto = {
        gpa: '4.0',
      };

      resumesRepository.findResumeByIdAndUserId.mockResolvedValue(
        mockResume as any,
      );
      educationRepository.updateEntityForResume.mockResolvedValue({
        ...mockEducation,
        gpa: updateDto.gpa!,
      } as any);

      const result = await service.updateEntityByIdForResume(
        'resume-123',
        'edu-123',
        'user-123',
        updateDto,
      );

      expect(result.data!.gpa).toBe(updateDto.gpa);
      expect(educationRepository.updateEntityForResume).toHaveBeenCalledWith(
        'edu-123',
        'resume-123',
        updateDto,
      );
    });
  });

  describe('deleteById', () => {
    it('should delete education entry successfully', async () => {
      resumesRepository.findResumeByIdAndUserId.mockResolvedValue(
        mockResume as any,
      );
      educationRepository.deleteEntityForResume.mockResolvedValue(true);

      const result = await service.deleteEntityByIdForResume(
        'resume-123',
        'edu-123',
        'user-123',
      );

      expect(result.message).toBe('Education deleted successfully');
      expect(educationRepository.deleteEntityForResume).toHaveBeenCalledWith(
        'edu-123',
        'resume-123',
      );
    });
  });

  describe('reorder', () => {
    it('should reorder education entries with custom message', async () => {
      resumesRepository.findResumeByIdAndUserId.mockResolvedValue(
        mockResume as any,
      );
      educationRepository.reorderEntitiesForResume.mockResolvedValue();

      const result = await service.reorderEntitiesInResume(
        'resume-123',
        'user-123',
        ['edu-1', 'edu-2'],
      );

      expect(result.message).toBe('Education entries reordered successfully');
      expect(educationRepository.reorderEntitiesForResume).toHaveBeenCalledWith(
        'resume-123',
        ['edu-1', 'edu-2'],
      );
    });
  });
});
