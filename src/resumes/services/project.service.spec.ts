import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectRepository } from '../repositories/project.repository';
import { ResumesRepository } from '../resumes.repository';
import { CreateProjectDto, UpdateProjectDto } from '../dto/project.dto';

describe('ProjectService', () => {
  let service: ProjectService;
  let projectRepository: jest.Mocked<ProjectRepository>;
  let resumesRepository: jest.Mocked<ResumesRepository>;

  const mockResume = {
    id: 'resume-123',
    userId: 'user-123',
    title: 'Test Resume',
  };

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
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      reorder: jest.fn(),
    };

    const mockResumesRepository = {
      findOne: jest.fn(),
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
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  describe('listForResume', () => {
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

      resumesRepository.findOne.mockResolvedValue(mockResume as any);
      projectRepository.findAll.mockResolvedValue(paginatedResult);

      const result = await service.listForResume('resume-123', 'user-123');

      expect(result).toEqual(paginatedResult);
      expect(resumesRepository.findOne).toHaveBeenCalledWith(
        'resume-123',
        'user-123',
      );
      expect(projectRepository.findAll).toHaveBeenCalledWith(
        'resume-123',
        1,
        20,
      );
    });
  });

  describe('getById', () => {
    it('should return single project', async () => {
      resumesRepository.findOne.mockResolvedValue(mockResume as any);
      projectRepository.findOne.mockResolvedValue(mockProject);

      const result = await service.getById(
        'resume-123',
        'project-123',
        'user-123',
      );

      expect(result.data).toEqual(mockProject);
      expect(projectRepository.findOne).toHaveBeenCalledWith(
        'project-123',
        'resume-123',
      );
    });

    it('should throw NotFoundException when project not found', async () => {
      resumesRepository.findOne.mockResolvedValue(mockResume as any);
      projectRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getById('resume-123', 'invalid-id', 'user-123'),
      ).rejects.toThrow('Project not found');
    });
  });

  describe('addToResume', () => {
    it('should create new project', async () => {
      const createDto: CreateProjectDto = {
        name: 'New Project',
        description: 'Description',
        startDate: '2023-01-01',
      };

      resumesRepository.findOne.mockResolvedValue(mockResume as any);
      projectRepository.create.mockResolvedValue(mockProject);

      const result = await service.addToResume(
        'resume-123',
        'user-123',
        createDto,
      );

      expect(result.data).toEqual(mockProject);
      expect(projectRepository.create).toHaveBeenCalledWith(
        'resume-123',
        createDto,
      );
    });
  });

  describe('updateById', () => {
    it('should update existing project', async () => {
      const updateDto: UpdateProjectDto = {
        name: 'Updated Project Name',
      };

      resumesRepository.findOne.mockResolvedValue(mockResume as any);
      projectRepository.update.mockResolvedValue({
        ...mockProject,
        name: updateDto.name!,
      } as any);

      const result = await service.updateById(
        'resume-123',
        'project-123',
        'user-123',
        updateDto,
      );

      expect(result.data!.name).toBe(updateDto.name);
      expect(projectRepository.update).toHaveBeenCalledWith(
        'project-123',
        'resume-123',
        updateDto,
      );
    });

    it('should throw NotFoundException when project not found', async () => {
      resumesRepository.findOne.mockResolvedValue(mockResume as any);
      projectRepository.update.mockResolvedValue(null);

      await expect(
        service.updateById('resume-123', 'invalid-id', 'user-123', {}),
      ).rejects.toThrow('Project not found');
    });
  });

  describe('deleteById', () => {
    it('should delete project successfully', async () => {
      resumesRepository.findOne.mockResolvedValue(mockResume as any);
      projectRepository.delete.mockResolvedValue(true);

      const result = await service.deleteById(
        'resume-123',
        'project-123',
        'user-123',
      );

      expect(result.message).toBe('Project deleted successfully');
      expect(projectRepository.delete).toHaveBeenCalledWith(
        'project-123',
        'resume-123',
      );
    });

    it('should throw NotFoundException when project not found', async () => {
      resumesRepository.findOne.mockResolvedValue(mockResume as any);
      projectRepository.delete.mockResolvedValue(false);

      await expect(
        service.deleteById('resume-123', 'invalid-id', 'user-123'),
      ).rejects.toThrow('Project not found');
    });
  });
});
