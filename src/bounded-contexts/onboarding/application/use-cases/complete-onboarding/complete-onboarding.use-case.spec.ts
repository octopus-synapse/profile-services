import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ERROR_MESSAGES } from '@/shared-kernel';
import {
  createOnboardingData,
  createOnboardingUser,
  InMemoryOnboardingRepository,
} from '../../../testing';
import type { OnboardingCompletionPort } from '../../../domain/ports/onboarding-completion.port';
import { CompleteOnboardingUseCase } from './complete-onboarding.use-case';

describe('CompleteOnboardingUseCase', () => {
  let useCase: CompleteOnboardingUseCase;
  let onboardingRepository: InMemoryOnboardingRepository;
  let mockCompletionAdapter: OnboardingCompletionPort;
  let mockLogger: {
    log: ReturnType<typeof mock>;
    warn: ReturnType<typeof mock>;
    error: ReturnType<typeof mock>;
    debug: ReturnType<typeof mock>;
  };
  let mockAuditLog: { logOnboardingCompleted: ReturnType<typeof mock> };

  beforeEach(() => {
    onboardingRepository = new InMemoryOnboardingRepository();

    mockCompletionAdapter = {
      executeCompletion: mock(async () => ({ resumeId: 'resume-123' })),
    };

    mockLogger = {
      log: mock(),
      warn: mock(),
      error: mock(),
      debug: mock(),
    };

    mockAuditLog = {
      logOnboardingCompleted: mock(async () => undefined),
    };

    useCase = new CompleteOnboardingUseCase(
      onboardingRepository,
      mockCompletionAdapter,
      mockLogger,
      mockAuditLog,
    );
  });

  describe('execute', () => {
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
        ],
      });

      const mockUser = createOnboardingUser({ id: userId });
      onboardingRepository.seedUser(mockUser);

      const result = await useCase.execute(userId, onboardingData);

      expect(result).toEqual({ resumeId: 'resume-123' });
      expect(mockCompletionAdapter.executeCompletion).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Onboarding process started',
        'CompleteOnboardingUseCase',
        { userId },
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Onboarding completed successfully',
        'CompleteOnboardingUseCase',
        { userId, resumeId: 'resume-123' },
      );
      expect(mockAuditLog.logOnboardingCompleted).toHaveBeenCalledWith(
        userId,
        'johndoe',
        'resume-123',
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

      await expect(useCase.execute(userId, onboardingData)).rejects.toThrow(NotFoundException);
      await expect(useCase.execute(userId, onboardingData)).rejects.toThrow(
        ERROR_MESSAGES.USER_NOT_FOUND,
      );
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should throw ConflictException if onboarding already completed', async () => {
      const userId = 'user-123';
      const mockUser = createOnboardingUser({
        id: userId,
        hasCompletedOnboarding: true,
      });
      onboardingRepository.seedUser(mockUser);

      const onboardingData = createOnboardingData();

      await expect(useCase.execute(userId, onboardingData)).rejects.toThrow(ConflictException);
    });

    it('should throw error if data validation fails', async () => {
      const userId = 'user-123';
      const invalidData = {};

      await expect(useCase.execute(userId, invalidData)).rejects.toThrow();
    });

    it('should handle username conflict (P2002) during transaction', async () => {
      const userId = 'user-123';
      const mockUser = createOnboardingUser({ id: userId });
      onboardingRepository.seedUser(mockUser);

      const prismaError = Object.assign(new Error('Unique constraint failed'), {
        code: 'P2002',
        meta: { target: ['username'] },
      });

      mockCompletionAdapter.executeCompletion = mock(async () => {
        throw prismaError;
      });

      const onboardingData = createOnboardingData();

      await expect(useCase.execute(userId, onboardingData)).rejects.toThrow(ConflictException);
      await expect(useCase.execute(userId, onboardingData)).rejects.toThrow(
        ERROR_MESSAGES.USERNAME_ALREADY_IN_USE,
      );
    });
  });
});
