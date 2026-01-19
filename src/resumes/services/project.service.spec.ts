import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test';
import { createMockResume } from '../../../test/factories/resume.factory';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ResourceNotFoundError } from '@octopus-synapse/profile-contracts';
import { ProjectService } from './project.service';
import { ProjectRepository } from '../repositories/project.repository';
import { ResumesRepository } from '../resumes.repository';
import { CreateProjectDto, UpdateProjectDto } from '../dto';

describe('ProjectService', () => {
  let service: ProjectService;
  let projectRepository: ProjectRepository;
  let resumesRepository: ResumesRepository;

  const mockResume = createMockResume({ id: 'resume-123', userId: 'user-123' });

  const mockProject = {
    id: 'project-123',
    resumeId: 'resume-123',
    name: 'E-Commerce Platform',
    description: 'Full-stack e-commerce solution',
    role: 'Lead Developer',
    technologies: ['React', 'Node.js', 'PostgreSQL'],
    startDate: new Date('2023-01-01'),
    endDate: new Date('2023-12-31'),
    url: 'https://github.com/user/project',
    highlights: ['Increased sales by 40%', 'Reduced load time by 60%'],
    isCurrent: false,
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockProjectRepository = {
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
        ProjectService,
        { provide: ProjectRepository, useValue: mockProjectRepository },
        { provide: ResumesRepository, useValue: mockResumesRepository },
      ],
    }).compile();

    service = module.get(ProjectService);
    projectRepository = module.get(ProjectRepository);
    resumesRepository = module.get(ResumesRepository);

    // Suppress logger output during tests
    spyOn(Logger.prototype, 'log').mockImplementation();
    spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  describe('listAllEntitiesForResume', () => {
    it('should return paginated projects for resume', async () => {
      const paginatedResult = {
        data: [mockProject],
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
      projectRepository.findAllEntitiesForResume.mockResolvedValue(
        paginatedResult,
      );

      const result = await service.listAllEntitiesForResume(
        'resume-123',
        'user-123',
      );

      expect(result).toEqual(paginatedResult);
      expect(resumesRepository.findResumeByIdAndUserId).toHaveBeenCalledWith(
        'resume-123',
        'user-123',
      );
      expect(projectRepository.findAllEntitiesForResume).toHaveBeenCalledWith(
        'resume-123',
        1,
        20,
      );
    });
  });

  describe('getEntityByIdForResume', () => {
    it('should return single project', async () => {
      resumesRepository.findResumeByIdAndUserId.mockResolvedValue(
        mockResume as any,
      );
      projectRepository.findEntityByIdAndResumeId.mockResolvedValue(
        mockProject,
      );

      const result = await service.getEntityByIdForResume(
        'resume-123',
        'project-123',
        'user-123',
      );

      expect(result.data).toEqual(mockProject);
      expect(projectRepository.findEntityByIdAndResumeId).toHaveBeenCalledWith(
        'project-123',
        'resume-123',
      );
    });

    it('should throw ResourceNotFoundError when project not found', async () => {
      resumesRepository.findResumeByIdAndUserId.mockResolvedValue(
        mockResume as any,
      );
      projectRepository.findEntityByIdAndResumeId.mockResolvedValue(null);

      await expect(
        service.getEntityByIdForResume('resume-123', 'invalid-id', 'user-123'),
      ).rejects.toThrow(ResourceNotFoundError);
    });
  });

  describe('addToResume', () => {
    it('should create new project', async () => {
      const createDto: CreateProjectDto = {
        name: 'New Project',
        description: 'Description',
        startDate: '2023-01-01',
      };

      resumesRepository.findResumeByIdAndUserId.mockResolvedValue(
        mockResume as any,
      );
      projectRepository.createEntityForResume.mockResolvedValue(mockProject);

      const result = await service.addEntityToResume(
        'resume-123',
        'user-123',
        createDto,
      );

      expect(result.data).toEqual(mockProject);
      expect(projectRepository.createEntityForResume).toHaveBeenCalledWith(
        'resume-123',
        createDto,
      );
    });
  });

  describe('updateEntityByIdForResume', () => {
    it('should update existing project', async () => {
      const updateDto: UpdateProjectDto = {
        name: 'Updated Project Name',
      };

      resumesRepository.findResumeByIdAndUserId.mockResolvedValue(
        mockResume as any,
      );
      projectRepository.updateEntityForResume.mockResolvedValue({
        ...mockProject,
        name: updateDto.name!,
      } as any);

      const result = await service.updateEntityByIdForResume(
        'resume-123',
        'project-123',
        'user-123',
        updateDto,
      );

      expect(result.data!.name).toBe(updateDto.name);
      expect(projectRepository.updateEntityForResume).toHaveBeenCalledWith(
        'project-123',
        'resume-123',
        updateDto,
      );
    });

    it('should throw ResourceNotFoundError when project not found', async () => {
      resumesRepository.findResumeByIdAndUserId.mockResolvedValue(
        mockResume as any,
      );
      projectRepository.updateEntityForResume.mockResolvedValue(null);

      await expect(
        service.updateEntityByIdForResume(
          'resume-123',
          'invalid-id',
          'user-123',
          {},
        ),
      ).rejects.toThrow(ResourceNotFoundError);
    });
  });

  describe('deleteEntityByIdForResume', () => {
    it('should delete project successfully', async () => {
      resumesRepository.findResumeByIdAndUserId.mockResolvedValue(
        mockResume as any,
      );
      projectRepository.deleteEntityForResume.mockResolvedValue(true);

      const result = await service.deleteEntityByIdForResume(
        'resume-123',
        'project-123',
        'user-123',
      );

      expect(result.message).toBe('Project deleted successfully');
      expect(projectRepository.deleteEntityForResume).toHaveBeenCalledWith(
        'project-123',
        'resume-123',
      );
    });

    it('should throw ResourceNotFoundError when project not found', async () => {
      resumesRepository.findResumeByIdAndUserId.mockResolvedValue(
        mockResume as any,
      );
      projectRepository.deleteEntityForResume.mockResolvedValue(false);

      await expect(
        service.deleteEntityByIdForResume(
          'resume-123',
          'invalid-id',
          'user-123',
        ),
      ).rejects.toThrow(ResourceNotFoundError);
    });
  });
});
