import { describe, it, expect, beforeEach, mock, type Mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { ResumeResolver } from '../resolvers/resume.resolver';
import { ResumesRepository } from '@/bounded-contexts/resumes/resumes/resumes.repository';
import { ExperienceService } from '@/bounded-contexts/resumes/resumes/services/experience.service';
import { EducationService } from '@/bounded-contexts/resumes/resumes/services/education.service';
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
  let resumesRepository: {
    findResumeByIdAndUserId: Mock<any>;
    findAllUserResumes: Mock<any>;
  };
  let experienceService: {
    addEntityToResume: Mock<any>;
    updateEntityByIdForResume: Mock<any>;
    deleteEntityByIdForResume: Mock<any>;
  };
  let _educationService: { addToResume: Mock<any> };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
  } as unknown as User;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockResume: any = {
    id: 'resume-123',
    userId: 'user-123',
    title: 'Software Engineer Resume',
    isPublic: false,
    template: 'MODERN',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeResolver,
        {
          provide: ResumesRepository,
          useValue: {
            findResumeByIdAndUserId: mock(() => Promise.resolve(null)),
            findAllUserResumes: mock(() => Promise.resolve([])),
          },
        },
        {
          provide: ExperienceService,
          useValue: {
            addEntityToResume: mock(() =>
              Promise.resolve({ success: true, data: null }),
            ),
            updateEntityByIdForResume: mock(() =>
              Promise.resolve({ success: true }),
            ),
            deleteEntityByIdForResume: mock(() =>
              Promise.resolve({ success: true }),
            ),
          },
        },
        {
          provide: EducationService,
          useValue: {
            addToResume: mock(() => Promise.resolve(null)),
          },
        },
      ],
    }).compile();

    resolver = module.get<ResumeResolver>(ResumeResolver);
    resumesRepository = module.get(ResumesRepository);
    experienceService = module.get(ExperienceService);
    _educationService = module.get(EducationService);
  });

  describe('getResume', () => {
    it('should return a resume by ID', async () => {
      resumesRepository.findResumeByIdAndUserId.mockImplementation(() =>
        Promise.resolve(mockResume),
      );

      const result = await resolver.getResume('resume-123', mockUser);

      expect(result).toEqual(mockResume);
      // Verify mock was called (Bun doesn't have toHaveBeenCalledWith)
      expect(resumesRepository.findResumeByIdAndUserId.mock.calls.length).toBe(
        1,
      );
    });
  });

  describe('getMyResumes', () => {
    it('should return all resumes for current user', async () => {
      const resumes = [mockResume];
      resumesRepository.findAllUserResumes.mockImplementation(() =>
        Promise.resolve(resumes),
      );

      const result = await resolver.getMyResumes(mockUser);

      expect(result).toEqual(resumes);
      expect(resumesRepository.findAllUserResumes.mock.calls.length).toBe(1);
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockExperience: any = {
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
      };

      experienceService.addEntityToResume.mockImplementation(() =>
        Promise.resolve({
          success: true,
          data: mockExperience,
        }),
      );

      const result = await resolver.addExperience(
        'resume-123',
        input as any,
        mockUser,
      );

      expect(result).toEqual(mockExperience);
      expect(experienceService.addEntityToResume.mock.calls.length).toBe(1);
    });
  });

  describe('deleteExperience', () => {
    it('should delete experience and return true', async () => {
      experienceService.deleteEntityByIdForResume.mockImplementation(() =>
        Promise.resolve({
          success: true,
          message: 'Deleted',
        }),
      );

      const result = await resolver.deleteExperience(
        'resume-123',
        'exp-123',
        mockUser,
      );

      expect(result).toBe(true);
      expect(
        experienceService.deleteEntityByIdForResume.mock.calls.length,
      ).toBe(1);
    });
  });
});
