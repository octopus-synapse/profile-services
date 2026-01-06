import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingProgressService } from './onboarding-progress.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import { ConflictException } from '@nestjs/common';
import { ERROR_MESSAGES } from '../../common/constants/config';

describe('OnboardingProgressService', () => {
  let service: OnboardingProgressService;
  let prismaService: jest.Mocked<PrismaService>;
  let logger: jest.Mocked<AppLoggerService>;

  beforeEach(async () => {
    const mockUpsert = jest.fn();
    const mockFindUnique = jest.fn();
    const mockDeleteMany = jest.fn();

    prismaService = {
      onboardingProgress: {
        upsert: mockUpsert,
        findUnique: mockFindUnique,
        deleteMany: mockDeleteMany,
      },
      user: {
        findUnique: jest.fn(),
      },
    } as any;

    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingProgressService,
        { provide: PrismaService, useValue: prismaService },
        { provide: AppLoggerService, useValue: logger },
      ],
    }).compile();

    service = module.get<OnboardingProgressService>(OnboardingProgressService);
  });

  describe('saveProgress', () => {
    it('should save onboarding progress successfully', async () => {
      const userId = 'user-123';
      const data = {
        currentStep: 'personal-info',
        completedSteps: ['welcome', 'username'],
        username: 'johndoe',
        personalInfo: { name: 'John Doe', email: 'john@example.com' },
      };

      const mockProgress = {
        userId,
        currentStep: data.currentStep,
        completedSteps: data.completedSteps,
        username: data.username,
        personalInfo: data.personalInfo,
      };

      const mockUserFindUnique = prismaService.user.findUnique as jest.Mock;
      const mockProgressUpsert = prismaService.onboardingProgress
        .upsert as jest.Mock;
      mockUserFindUnique.mockResolvedValue(null); // Username available
      mockProgressUpsert.mockResolvedValue(mockProgress);

      const result = await service.saveProgress(userId, data);

      expect(result).toEqual({
        success: true,
        currentStep: data.currentStep,
        completedSteps: data.completedSteps,
      });
      expect(mockProgressUpsert).toHaveBeenCalledWith({
        where: { userId },
        update: expect.objectContaining({
          currentStep: data.currentStep,
          completedSteps: data.completedSteps,
          username: data.username,
        }),
        create: expect.objectContaining({
          userId,
          currentStep: data.currentStep,
        }),
      });
      expect(logger.debug).toHaveBeenCalled();
    });

    it('should create new progress when user has none', async () => {
      const userId = 'new-user-123';
      const data = {
        currentStep: 'welcome',
        completedSteps: [],
      };

      const mockProgress = {
        userId,
        currentStep: 'welcome',
        completedSteps: [],
      };

      const mockProgressUpsert = prismaService.onboardingProgress
        .upsert as jest.Mock;
      mockProgressUpsert.mockResolvedValue(mockProgress);

      const result = await service.saveProgress(userId, data);

      expect(result.success).toBe(true);
      expect(mockProgressUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            userId,
            currentStep: 'welcome',
          }),
        }),
      );
    });

    it('should throw ConflictException when username is taken by another user', async () => {
      const userId = 'user-123';
      const data = {
        currentStep: 'username',
        completedSteps: [],
        username: 'takenusername',
      };

      const mockUserFindUnique = prismaService.user.findUnique as jest.Mock;
      mockUserFindUnique.mockResolvedValue({ id: 'other-user-456' }); // Username taken

      await expect(service.saveProgress(userId, data)).rejects.toThrow(
        new ConflictException(ERROR_MESSAGES.USERNAME_ALREADY_IN_USE),
      );

      const mockProgressUpsert = prismaService.onboardingProgress
        .upsert as jest.Mock;
      expect(mockProgressUpsert).not.toHaveBeenCalled();
    });

    it('should allow saving when username belongs to the same user', async () => {
      const userId = 'user-123';
      const data = {
        currentStep: 'personal-info',
        completedSteps: ['welcome', 'username'],
        username: 'myusername',
      };

      const mockUserFindUnique = prismaService.user.findUnique as jest.Mock;
      const mockProgressUpsert = prismaService.onboardingProgress
        .upsert as jest.Mock;
      mockUserFindUnique.mockResolvedValue({ id: userId }); // Same user
      mockProgressUpsert.mockResolvedValue({
        userId,
        currentStep: data.currentStep,
        completedSteps: data.completedSteps,
      });

      const result = await service.saveProgress(userId, data);

      expect(result.success).toBe(true);
      expect(mockProgressUpsert).toHaveBeenCalled();
    });

    it('should save experiences array when provided', async () => {
      const userId = 'user-123';
      const data = {
        currentStep: 'experience',
        completedSteps: ['welcome', 'username', 'personal-info'],
        experiences: [
          { company: 'Acme Inc', role: 'Developer', startDate: '2020-01' },
        ],
      };

      const mockProgressUpsert = prismaService.onboardingProgress
        .upsert as jest.Mock;
      mockProgressUpsert.mockResolvedValue({
        userId,
        currentStep: data.currentStep,
        completedSteps: data.completedSteps,
      });

      await service.saveProgress(userId, data);

      expect(mockProgressUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            experiences: data.experiences,
          }),
        }),
      );
    });

    it('should handle noExperience flag', async () => {
      const userId = 'user-123';
      const data = {
        currentStep: 'education',
        completedSteps: ['welcome', 'username', 'personal-info', 'experience'],
        noExperience: true,
      };

      const mockProgressUpsert = prismaService.onboardingProgress
        .upsert as jest.Mock;
      mockProgressUpsert.mockResolvedValue({
        userId,
        currentStep: data.currentStep,
        completedSteps: data.completedSteps,
      });

      await service.saveProgress(userId, data);

      expect(mockProgressUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            noExperience: true,
          }),
        }),
      );
    });

    it('should save education array when provided', async () => {
      const userId = 'user-123';
      const data = {
        currentStep: 'skills',
        completedSteps: [
          'welcome',
          'username',
          'personal-info',
          'experience',
          'education',
        ],
        education: [
          { institution: 'University', degree: 'Bachelor', fieldOfStudy: 'CS' },
        ],
      };

      const mockProgressUpsert = prismaService.onboardingProgress
        .upsert as jest.Mock;
      mockProgressUpsert.mockResolvedValue({
        userId,
        currentStep: data.currentStep,
        completedSteps: data.completedSteps,
      });

      await service.saveProgress(userId, data);

      expect(mockProgressUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            education: data.education,
          }),
        }),
      );
    });

    it('should handle noEducation flag', async () => {
      const userId = 'user-123';
      const data = {
        currentStep: 'skills',
        completedSteps: [
          'welcome',
          'username',
          'personal-info',
          'experience',
          'education',
        ],
        noEducation: true,
      };

      const mockProgressUpsert = prismaService.onboardingProgress
        .upsert as jest.Mock;
      mockProgressUpsert.mockResolvedValue({
        userId,
        currentStep: data.currentStep,
        completedSteps: data.completedSteps,
      });

      await service.saveProgress(userId, data);

      expect(mockProgressUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            noEducation: true,
          }),
        }),
      );
    });

    it('should save skills and languages arrays', async () => {
      const userId = 'user-123';
      const data = {
        currentStep: 'template',
        completedSteps: [
          'welcome',
          'username',
          'personal-info',
          'experience',
          'education',
          'skills',
          'languages',
        ],
        skills: [{ name: 'JavaScript' }] as any,
        languages: [{ code: 'en' }] as any,
      };

      const mockProgressUpsert = prismaService.onboardingProgress
        .upsert as jest.Mock;
      mockProgressUpsert.mockResolvedValue({
        userId,
        currentStep: data.currentStep,
        completedSteps: data.completedSteps,
      });

      await service.saveProgress(userId, data);

      expect(mockProgressUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            skills: data.skills,
            languages: data.languages,
          }),
        }),
      );
    });
  });

  describe('getProgress', () => {
    it('should return existing progress when found', async () => {
      const userId = 'user-123';
      const mockProgress = {
        userId,
        currentStep: 'education',
        completedSteps: ['welcome', 'username', 'personal-info'],
        username: 'johndoe',
        personalInfo: { name: 'John Doe' },
        professionalProfile: { title: 'Developer' },
        experiences: [{ company: 'Acme Inc' }],
        noExperience: false,
        education: [],
        noEducation: false,
        skills: [],
        noSkills: false,
        languages: [],
        templateSelection: null,
      };

      const mockProgressFindUnique = prismaService.onboardingProgress
        .findUnique as jest.Mock;
      mockProgressFindUnique.mockResolvedValue(mockProgress);

      const result = await service.getProgress(userId);

      expect(result).toEqual({
        currentStep: mockProgress.currentStep,
        completedSteps: mockProgress.completedSteps,
        username: mockProgress.username,
        personalInfo: mockProgress.personalInfo,
        professionalProfile: mockProgress.professionalProfile,
        experiences: mockProgress.experiences,
        noExperience: mockProgress.noExperience,
        education: mockProgress.education,
        noEducation: mockProgress.noEducation,
        skills: mockProgress.skills,
        noSkills: mockProgress.noSkills,
        languages: mockProgress.languages,
        templateSelection: mockProgress.templateSelection,
      });
    });

    it('should return initial progress when not found', async () => {
      const userId = 'new-user-123';

      const mockProgressFindUnique = prismaService.onboardingProgress
        .findUnique as jest.Mock;
      mockProgressFindUnique.mockResolvedValue(null);

      const result = await service.getProgress(userId);

      expect(result).toEqual({
        currentStep: 'welcome',
        completedSteps: [],
        username: null,
        personalInfo: null,
        professionalProfile: null,
        experiences: [],
        noExperience: false,
        education: [],
        noEducation: false,
        skills: [],
        noSkills: false,
        languages: [],
        templateSelection: null,
      });
    });

    it('should handle null arrays in progress data', async () => {
      const userId = 'user-123';
      const mockProgress = {
        userId,
        currentStep: 'experience',
        completedSteps: ['welcome'],
        username: null,
        personalInfo: null,
        professionalProfile: null,
        experiences: null, // Null array
        noExperience: false,
        education: null,
        noEducation: false,
        skills: null,
        noSkills: false,
        languages: null,
        templateSelection: null,
      };

      const mockProgressFindUnique = prismaService.onboardingProgress
        .findUnique as jest.Mock;
      mockProgressFindUnique.mockResolvedValue(mockProgress);

      const result = await service.getProgress(userId);

      expect(result.experiences).toEqual([]);
      expect(result.education).toEqual([]);
      expect(result.skills).toEqual([]);
      expect(result.languages).toEqual([]);
    });
  });

  describe('deleteProgress', () => {
    it('should delete progress successfully', async () => {
      const userId = 'user-123';

      const mockProgressDeleteMany = prismaService.onboardingProgress
        .deleteMany as jest.Mock;
      mockProgressDeleteMany.mockResolvedValue({ count: 1 });

      await service.deleteProgress(userId);

      expect(mockProgressDeleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
    });

    it('should not throw when no progress exists', async () => {
      const userId = 'user-without-progress';

      const mockProgressDeleteMany = prismaService.onboardingProgress
        .deleteMany as jest.Mock;
      mockProgressDeleteMany.mockResolvedValue({ count: 0 });

      await expect(service.deleteProgress(userId)).resolves.not.toThrow();
    });
  });

  describe('deleteProgressWithTx', () => {
    it('should delete progress within transaction', async () => {
      const userId = 'user-123';
      const mockTx = {
        onboardingProgress: {
          deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      } as any;

      await service.deleteProgressWithTx(mockTx, userId);

      expect(mockTx.onboardingProgress.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
    });
  });
});
