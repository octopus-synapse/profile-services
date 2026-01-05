import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppLoggerService } from '../common/logger/logger.service';
import { AuditLogService } from '../common/audit/audit-log.service';
import { ResumeOnboardingService } from './services/resume-onboarding.service';
import { SkillsOnboardingService } from './services/skills-onboarding.service';
import { ExperienceOnboardingService } from './services/experience-onboarding.service';
import { EducationOnboardingService } from './services/education-onboarding.service';
import { LanguagesOnboardingService } from './services/languages-onboarding.service';
import { OnboardingProgressService } from './services/onboarding-progress.service';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../common/constants/config';

describe('OnboardingService', () => {
  let service: OnboardingService;
  let logger: AppLoggerService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    onboardingProgress: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockLoggerService = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  const mockResumeOnboardingService = {
    upsertResume: jest.fn(),
    upsertResumeWithTx: jest.fn(),
  };

  const mockSkillsOnboardingService = {
    saveSkills: jest.fn(),
    saveSkillsWithTx: jest.fn(),
  };

  const mockExperienceOnboardingService = {
    saveExperiences: jest.fn(),
    saveExperiencesWithTx: jest.fn(),
  };

  const mockEducationOnboardingService = {
    saveEducation: jest.fn(),
    saveEducationWithTx: jest.fn(),
  };

  const mockLanguagesOnboardingService = {
    saveLanguages: jest.fn(),
    saveLanguagesWithTx: jest.fn(),
  };

  const mockOnboardingProgressService = {
    updateProgress: jest.fn(),
    markCompleted: jest.fn(),
    deleteProgress: jest.fn(),
    deleteProgressWithTx: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AppLoggerService,
          useValue: mockLoggerService,
        },
        {
          provide: AuditLogService,
          useValue: {
            log: jest.fn(),
            logOnboardingCompleted: jest.fn(),
            logUsernameChange: jest.fn(),
            logUnauthorizedAccess: jest.fn(),
          },
        },
        {
          provide: ResumeOnboardingService,
          useValue: mockResumeOnboardingService,
        },
        {
          provide: SkillsOnboardingService,
          useValue: mockSkillsOnboardingService,
        },
        {
          provide: ExperienceOnboardingService,
          useValue: mockExperienceOnboardingService,
        },
        {
          provide: EducationOnboardingService,
          useValue: mockEducationOnboardingService,
        },
        {
          provide: LanguagesOnboardingService,
          useValue: mockLanguagesOnboardingService,
        },
        {
          provide: OnboardingProgressService,
          useValue: mockOnboardingProgressService,
        },
      ],
    }).compile();

    service = module.get<OnboardingService>(OnboardingService);
    logger = module.get<AppLoggerService>(AppLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('completeOnboarding', () => {
    it('should successfully complete onboarding', async () => {
      const userId = 'user-123';
      const onboardingData = {
        username: 'johndoe',
        personalInfo: {
          fullName: 'John Doe',
          email: 'john@example.com',
          phone: '1234567890',
          location: 'New York, NY',
        },
        professionalProfile: {
          jobTitle: 'Senior Developer',
          summary:
            'Experienced developer with 5+ years in full-stack development',
          linkedin: 'https://linkedin.com/in/johndoe',
          github: 'https://github.com/johndoe',
          website: 'https://johndoe.com',
        },
        skills: [
          { name: 'JavaScript', category: 'Frontend' },
          { name: 'Node.js', category: 'Backend' },
        ],
        noSkills: false,
        experiences: [
          {
            company: 'Tech Corp',
            position: 'Senior Developer',
            startDate: '2020-01',
            endDate: '2024-01',
            current: false,
            description: 'Building applications',
          },
        ],
        noExperience: false,
        education: [
          {
            institution: 'University',
            degree: 'BSc',
            field: 'Computer Science',
            startDate: '2015-09',
            endDate: '2019-06',
            current: false,
          },
        ],
        noEducation: false,
        languages: [
          { language: 'English', proficiency: 'NATIVE' as const },
          { language: 'Spanish', proficiency: 'CONVERSATIONAL' as const },
        ],
        templateSelection: {
          template: 'PROFESSIONAL',
          palette: 'blue',
        },
      };

      const mockUser = { id: userId, email: 'john@example.com' };
      const mockResume = { id: 'resume-123', userId };
      const mockTx = {
        resume: { findFirst: jest.fn(), upsert: jest.fn() },
        skill: { deleteMany: jest.fn(), createMany: jest.fn() },
        experience: { deleteMany: jest.fn(), createMany: jest.fn() },
        education: { deleteMany: jest.fn(), createMany: jest.fn() },
        language: { deleteMany: jest.fn(), createMany: jest.fn() },
        user: { update: jest.fn() },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockResumeOnboardingService.upsertResumeWithTx.mockResolvedValue(
        mockResume,
      );
      mockSkillsOnboardingService.saveSkillsWithTx.mockResolvedValue(undefined);
      mockExperienceOnboardingService.saveExperiencesWithTx.mockResolvedValue(
        undefined,
      );
      mockEducationOnboardingService.saveEducationWithTx.mockResolvedValue(
        undefined,
      );
      mockLanguagesOnboardingService.saveLanguagesWithTx.mockResolvedValue(
        undefined,
      );
      mockTx.user.update.mockResolvedValue({
        ...mockUser,
        hasCompletedOnboarding: true,
      });

      // Mock $transaction to execute the callback with mockTx
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const result = await service.completeOnboarding(userId, onboardingData);

      expect(result).toEqual({
        success: true,
        resumeId: mockResume.id,
        message: SUCCESS_MESSAGES.ONBOARDING_COMPLETED,
      });

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(
        mockResumeOnboardingService.upsertResumeWithTx,
      ).toHaveBeenCalledWith(mockTx, userId, onboardingData);
      expect(mockSkillsOnboardingService.saveSkillsWithTx).toHaveBeenCalledWith(
        mockTx,
        mockResume.id,
        onboardingData,
      );
      expect(
        mockExperienceOnboardingService.saveExperiencesWithTx,
      ).toHaveBeenCalledWith(mockTx, mockResume.id, onboardingData);
      expect(
        mockEducationOnboardingService.saveEducationWithTx,
      ).toHaveBeenCalledWith(mockTx, mockResume.id, onboardingData);
      expect(
        mockLanguagesOnboardingService.saveLanguagesWithTx,
      ).toHaveBeenCalledWith(mockTx, mockResume.id, onboardingData);
      expect(mockTx.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          hasCompletedOnboarding: true,
          onboardingCompletedAt: expect.any(Date),
          username: onboardingData.username,
          displayName: onboardingData.personalInfo.fullName,
          phone: onboardingData.personalInfo.phone,
          location: onboardingData.personalInfo.location,
          bio: onboardingData.professionalProfile.summary,
          linkedin: onboardingData.professionalProfile.linkedin,
          github: onboardingData.professionalProfile.github,
          website: onboardingData.professionalProfile.website,
        },
      });
      expect(logger.log).toHaveBeenCalledWith(
        'Onboarding process started',
        'OnboardingService',
        { userId },
      );
      expect(logger.log).toHaveBeenCalledWith(
        'Onboarding completed successfully',
        'OnboardingService',
        { userId, resumeId: mockResume.id },
      );
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const userId = 'invalid-user';
      const onboardingData = {
        username: 'johndoe',
        personalInfo: {
          fullName: 'John Doe',
          email: 'john@example.com',
        },
        professionalProfile: {
          jobTitle: 'Developer',
          summary:
            'A passionate developer looking to make a difference in tech',
        },
        skills: [],
        noSkills: true,
        experiences: [],
        noExperience: true,
        education: [],
        noEducation: true,
        languages: [],
        templateSelection: {
          template: 'PROFESSIONAL',
          palette: 'blue',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.completeOnboarding(userId, onboardingData),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.completeOnboarding(userId, onboardingData),
      ).rejects.toThrow(ERROR_MESSAGES.USER_NOT_FOUND);

      expect(mockResumeOnboardingService.upsertResume).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should throw error if data validation fails', async () => {
      const userId = 'user-123';
      const invalidData = {
        // Missing required fields
      };

      await expect(
        service.completeOnboarding(userId, invalidData),
      ).rejects.toThrow();
    });
  });

  describe('getOnboardingStatus', () => {
    it('should successfully get onboarding status', async () => {
      const userId = 'user-123';
      const completedAt = new Date('2024-01-01');
      const mockUser = {
        hasCompletedOnboarding: true,
        onboardingCompletedAt: completedAt,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getOnboardingStatus(userId);

      expect(result).toEqual({
        hasCompletedOnboarding: true,
        onboardingCompletedAt: completedAt,
      });

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          hasCompletedOnboarding: true,
          onboardingCompletedAt: true,
        },
      });
    });

    it('should return incomplete status for user who has not completed onboarding', async () => {
      const userId = 'user-123';
      const mockUser = {
        hasCompletedOnboarding: false,
        onboardingCompletedAt: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getOnboardingStatus(userId);

      expect(result).toEqual({
        hasCompletedOnboarding: false,
        onboardingCompletedAt: null,
      });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const userId = 'invalid-user';
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getOnboardingStatus(userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getOnboardingStatus(userId)).rejects.toThrow(
        ERROR_MESSAGES.USER_NOT_FOUND,
      );
    });
  });
});
