import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createMockResume } from '@test/shared/factories/resume.factory';
import { AuditLogService } from '@/bounded-contexts/platform/common/audit/audit-log.service';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ERROR_MESSAGES } from '@/shared-kernel';
import {
  createOnboardingData,
  createOnboardingUser,
  InMemoryOnboardingProgressRepository,
  InMemoryOnboardingRepository,
} from '../testing';
import { OnboardingService } from './onboarding.service';
import { OnboardingCompletionService } from './services/onboarding-completion.service';
import { OnboardingNavigationService } from './services/onboarding-navigation.service';
import { OnboardingProgressService } from './services/onboarding-progress.service';
import { ResumeOnboardingService } from './services/resume-onboarding.service';
import { ResumeSectionOnboardingService } from './services/resume-section-onboarding.service';
import { SectionTypeDefinitionQuery } from './services/section-type-definition.query';

describe('OnboardingService', () => {
  let service: OnboardingService;
  let onboardingRepository: InMemoryOnboardingRepository;
  let progressRepository: InMemoryOnboardingProgressRepository;

  const mockPrismaService = {
    user: {
      findUnique: mock(),
      update: mock(),
    },
    sectionType: {
      findMany: mock(),
    },
    onboardingProgress: {
      deleteMany: mock(),
    },
    $transaction: mock(),
  };

  const mockLoggerService = {
    log: mock(),
    warn: mock(),
    error: mock(),
    debug: mock(),
  };

  const mockResumeOnboardingService = {
    upsertResume: mock(),
    upsertResumeWithTx: mock(),
  };

  const mockSectionOnboardingService = {
    replaceSectionItems: mock(),
  };

  const mockOnboardingProgressService = {
    updateProgress: mock(),
    markCompleted: mock(),
    deleteProgress: mock(),
    deleteProgressWithTx: mock(),
    saveProgress: mock(),
    getProgress: mock(),
  };

  beforeEach(async () => {
    onboardingRepository = new InMemoryOnboardingRepository();
    progressRepository = new InMemoryOnboardingProgressRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        OnboardingCompletionService,
        OnboardingNavigationService,
        SectionTypeDefinitionQuery,
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
            log: mock(),
            logOnboardingCompleted: mock(),
            logUsernameChange: mock(),
            logUnauthorizedAccess: mock(),
          },
        },
        {
          provide: ResumeOnboardingService,
          useValue: mockResumeOnboardingService,
        },
        {
          provide: ResumeSectionOnboardingService,
          useValue: mockSectionOnboardingService,
        },
        {
          provide: OnboardingProgressService,
          useValue: mockOnboardingProgressService,
        },
      ],
    }).compile();

    service = module.get<OnboardingService>(OnboardingService);
  });

  afterEach(() => {
    onboardingRepository.clear();
    progressRepository.clear();
  });

  describe('completeOnboarding', () => {
    it('should successfully complete onboarding', async () => {
      const userId = 'user-123';
      const onboardingData = createOnboardingData({
        username: 'johndoe',
        personalInfo: {
          fullName: 'John Doe',
          email: 'john@example.com',
          phone: '1234567890',
          location: 'New York, NY',
        },
        professionalProfile: {
          jobTitle: 'Senior Developer',
          summary: 'Experienced developer with 5+ years in full-stack development',
          linkedin: 'https://linkedin.com/in/johndoe',
          github: 'https://github.com/johndoe',
          website: 'https://johndoe.com',
        },
        templateSelection: {
          template: 'PROFESSIONAL',
          palette: 'blue',
        },
        sections: [
          {
            sectionTypeKey: 'skills_v1',
            noData: false,
            items: [
              { content: { name: 'JavaScript', category: 'Frontend' } },
              { content: { name: 'Node.js', category: 'Backend' } },
            ],
          },
          {
            sectionTypeKey: 'work_experience_v1',
            noData: false,
            items: [
              {
                content: {
                  company: 'Tech Corp',
                  position: 'Senior Developer',
                  startDate: '2020-01',
                  endDate: '2024-01',
                  isCurrent: false,
                  description: 'Building applications',
                },
              },
            ],
          },
          {
            sectionTypeKey: 'education_v1',
            noData: false,
            items: [
              {
                content: {
                  institution: 'University',
                  degree: 'BSc',
                  field: 'Computer Science',
                  startDate: '2015-09',
                  endDate: '2019-06',
                  isCurrent: false,
                },
              },
            ],
          },
          {
            sectionTypeKey: 'languages_v1',
            noData: false,
            items: [
              { content: { name: 'English', level: 'NATIVE' } },
              { content: { name: 'Spanish', level: 'INTERMEDIATE' } },
            ],
          },
        ],
      });

      const mockUser = createOnboardingUser({ id: userId });
      onboardingRepository.seedUser(mockUser);
      const mockResume = createMockResume({ id: 'resume-123', userId });
      const mockTx = {
        resume: { findFirst: mock(), upsert: mock() },
        sectionType: { findUnique: mock() },
        resumeSection: { upsert: mock() },
        sectionItem: { deleteMany: mock(), createMany: mock() },
        user: { update: mock() },
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockUser.id,
        hasCompletedOnboarding: mockUser.hasCompletedOnboarding,
      });
      mockResumeOnboardingService.upsertResumeWithTx.mockResolvedValue(mockResume);
      mockSectionOnboardingService.replaceSectionItems.mockResolvedValue(undefined);
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
        resumeId: mockResume.id,
      });

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockResumeOnboardingService.upsertResumeWithTx).toHaveBeenCalledWith(
        mockTx,
        userId,
        onboardingData,
      );
      // Verify sections are processed generically
      expect(mockSectionOnboardingService.replaceSectionItems).toHaveBeenCalledTimes(4);
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
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        'Onboarding process started',
        'OnboardingCompletionService',
        {
          userId,
        },
      );
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        'Onboarding completed successfully',
        'OnboardingCompletionService',
        { userId, resumeId: mockResume.id },
      );
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const userId = 'invalid-user';
      const onboardingData = createOnboardingData({
        username: 'johndoe',
        personalInfo: {
          fullName: 'John Doe',
          email: 'john@example.com',
        },
        professionalProfile: {
          jobTitle: 'Developer',
          summary: 'A passionate developer looking to make a difference in tech',
        },
        templateSelection: {
          template: 'PROFESSIONAL',
          palette: 'blue',
        },
        sections: [],
      });

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.completeOnboarding(userId, onboardingData)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.completeOnboarding(userId, onboardingData)).rejects.toThrow(
        ERROR_MESSAGES.USER_NOT_FOUND,
      );

      expect(mockResumeOnboardingService.upsertResume.mock.calls.length).toBe(0);
      expect(mockLoggerService.warn).toHaveBeenCalled();
    });

    it('should throw error if data validation fails', async () => {
      const userId = 'user-123';
      const invalidData = {
        // Missing required fields
      };

      await expect(service.completeOnboarding(userId, invalidData)).rejects.toThrow();
    });
  });

  describe('getOnboardingStatus', () => {
    it('should successfully get onboarding status', async () => {
      const userId = 'user-123';
      const completedAt = new Date('2024-01-01');
      const mockUser = createOnboardingUser({
        id: userId,
        hasCompletedOnboarding: true,
        onboardingCompletedAt: completedAt,
      });

      onboardingRepository.seedUser(mockUser);
      mockPrismaService.user.findUnique.mockResolvedValue({
        hasCompletedOnboarding: mockUser.hasCompletedOnboarding,
        onboardingCompletedAt: mockUser.onboardingCompletedAt,
      });

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
      const mockUser = createOnboardingUser({
        id: userId,
        hasCompletedOnboarding: false,
        onboardingCompletedAt: null,
      });

      onboardingRepository.seedUser(mockUser);
      mockPrismaService.user.findUnique.mockResolvedValue({
        hasCompletedOnboarding: mockUser.hasCompletedOnboarding,
        onboardingCompletedAt: mockUser.onboardingCompletedAt,
      });

      const result = await service.getOnboardingStatus(userId);

      expect(result).toEqual({
        hasCompletedOnboarding: false,
        onboardingCompletedAt: null,
      });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const userId = 'invalid-user';
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(async () => await service.getOnboardingStatus(userId)).toThrow(
        NotFoundException,
      );
      await expect(async () => await service.getOnboardingStatus(userId)).toThrow(
        ERROR_MESSAGES.USER_NOT_FOUND,
      );
    });
  });
});
