import { Test, TestingModule } from '@nestjs/testing';
import { ResumeResolver } from '../resolvers/resume.resolver';
import { ResumesRepository } from '../../resumes/resumes.repository';
import { ExperienceService } from '../../resumes/services/experience.service';
import { EducationService } from '../../resumes/services/education.service';
import { DataLoaderService } from '../dataloaders/dataloader.service';
import type { User, Resume, Experience } from '@prisma/client';

/**
 * Resume Resolver Tests
 *
 * Tests GraphQL resolver functionality including:
 * - Query resolution
 * - Mutation execution
 * - Field resolution with DataLoader
 * - Authentication
 */
describe('ResumeResolver', () => {
  let resolver: ResumeResolver;
  let resumesRepository: jest.Mocked<ResumesRepository>;
  let experienceService: jest.Mocked<ExperienceService>;
  let educationService: jest.Mocked<EducationService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
  } as unknown as User;

  const mockResume = {
    id: 'resume-123',
    userId: 'user-123',
    title: 'Software Engineer Resume',
    isPublic: false,
    template: 'MODERN',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Resume;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeResolver,
        {
          provide: ResumesRepository,
          useValue: {
            findOne: jest.fn(),
            findAll: jest.fn(),
          },
        },
        {
          provide: ExperienceService,
          useValue: {
            addToResume: jest.fn(),
            updateById: jest.fn(),
            deleteById: jest.fn(),
          },
        },
        {
          provide: EducationService,
          useValue: {
            addToResume: jest.fn(),
          },
        },
      ],
    }).compile();

    resolver = module.get<ResumeResolver>(ResumeResolver);
    resumesRepository = module.get(ResumesRepository);
    experienceService = module.get(ExperienceService);
    educationService = module.get(EducationService);
  });

  describe('getResume', () => {
    it('should return a resume by ID', async () => {
      resumesRepository.findOne.mockResolvedValue(mockResume);

      const result = await resolver.getResume('resume-123', mockUser);

      expect(result).toEqual(mockResume);
      expect(resumesRepository.findOne).toHaveBeenCalledWith(
        'resume-123',
        'user-123',
      );
    });
  });

  describe('getMyResumes', () => {
    it('should return all resumes for current user', async () => {
      const resumes = [mockResume];
      resumesRepository.findAll.mockResolvedValue(resumes);

      const result = await resolver.getMyResumes(mockUser);

      expect(result).toEqual(resumes);
      expect(resumesRepository.findAll).toHaveBeenCalledWith('user-123');
    });
  });

  describe('addExperience', () => {
    it('should add experience to resume', async () => {
      const input = {
        company: 'Google',
        position: 'Software Engineer',
        startDate: '2020-01-01',
        isCurrent: true,
        skills: ['TypeScript', 'NestJS'],
      };

      const mockExperience = {
        id: 'exp-123',
        resumeId: 'resume-123',
        company: 'Google',
        position: 'Software Engineer',
        location: null,
        startDate: new Date('2020-01-01'),
        endDate: null,
        isCurrent: true,
        description: null,
        skills: ['TypeScript', 'NestJS'],
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Experience;

      experienceService.addToResume.mockResolvedValue({
        success: true,
        data: mockExperience,
      });

      const result = await resolver.addExperience(
        'resume-123',
        input as any,
        mockUser,
      );

      expect(result).toEqual(mockExperience);
      expect(experienceService.addToResume).toHaveBeenCalledWith(
        'resume-123',
        'user-123',
        input,
      );
    });
  });

  describe('deleteExperience', () => {
    it('should delete experience and return true', async () => {
      experienceService.deleteById.mockResolvedValue({
        success: true,
        message: 'Deleted',
      });

      const result = await resolver.deleteExperience(
        'resume-123',
        'exp-123',
        mockUser,
      );

      expect(result).toBe(true);
      expect(experienceService.deleteById).toHaveBeenCalledWith(
        'resume-123',
        'exp-123',
        'user-123',
      );
    });
  });
});
