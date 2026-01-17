/**
 * Onboarding Progress Service
 * Single Responsibility: Manage onboarding progress (checkpoints)
 */

import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '../../common/logger/logger.service';
import { OnboardingRepository } from '../repositories';
import type { OnboardingProgress } from '@octopus-synapse/profile-contracts';
import {
  UsernameConflictError,
  BusinessRuleError,
} from '@octopus-synapse/profile-contracts';
import { Prisma } from '@prisma/client';

/** Onboarding progress expires after 36 hours */
const PROGRESS_EXPIRATION_HOURS = 36;

const INITIAL_PROGRESS = {
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
};

@Injectable()
export class OnboardingProgressService {
  constructor(
    private readonly repository: OnboardingRepository,
    private readonly logger: AppLoggerService,
  ) {}

  async saveProgress(userId: string, data: OnboardingProgress) {
    this.logger.debug(
      'Saving onboarding progress',
      'OnboardingProgressService',
      {
        userId,
        currentStep: data.currentStep,
      },
    );

    // BUG-011, BUG-012, BUG-013 FIX: Validate flag + array combinations
    this.validateFlagArrayConsistency(data);

    // Validate username uniqueness if provided
    if (data.username) {
      await this.validateUsernameUniqueness(data.username, userId);
    }

    const progressData = this.buildProgressData(data);

    const progress = await this.repository.upsertOnboardingProgress(
      userId,
      progressData,
    );

    return {
      success: true,
      currentStep: progress.currentStep,
      completedSteps: progress.completedSteps,
    };
  }

  private async validateUsernameUniqueness(
    username: string,
    userId: string,
  ): Promise<void> {
    const existingUser = await this.repository.findUserByUsername(username);

    // Allow if it's the same user (user already has this username)
    if (existingUser?.id === userId) {
      return;
    }

    // Check if username is taken by another user
    if (existingUser) {
      throw new UsernameConflictError(username);
    }
  }

  async getProgress(userId: string) {
    const progress = await this.repository.findOnboardingProgress(userId);

    if (!progress) {
      return INITIAL_PROGRESS;
    }

    // BUG-006 FIX: Check for expiration (36 hours)
    if (this.isProgressExpired(progress.updatedAt)) {
      this.logger.debug(
        'Onboarding progress expired, deleting and returning initial',
        'OnboardingProgressService',
        { userId },
      );
      await this.deleteProgress(userId);
      return INITIAL_PROGRESS;
    }

    return {
      currentStep: progress.currentStep,
      completedSteps: progress.completedSteps,
      username: progress.username,
      personalInfo: progress.personalInfo,
      professionalProfile: progress.professionalProfile,
      experiences: progress.experiences ?? [],
      noExperience: progress.noExperience,
      education: progress.education ?? [],
      noEducation: progress.noEducation,
      skills: progress.skills ?? [],
      noSkills: progress.noSkills,
      languages: progress.languages ?? [],
      templateSelection: progress.templateSelection,
    };
  }

  async deleteProgress(userId: string) {
    await this.repository.deleteOnboardingProgress(userId);
  }

  /**
   * Delete progress within a transaction (used by onboarding completion)
   * @param tx Prisma transaction client
   * @param userId User ID
   */
  async deleteProgressWithTx(
    tx: Prisma.TransactionClient,
    userId: string,
  ): Promise<void> {
    await this.repository.deleteOnboardingProgressWithTx(tx, userId);
  }

  private buildProgressData(data: OnboardingProgress) {
    return {
      currentStep: data.currentStep,
      completedSteps: data.completedSteps,
      username: data.username ?? undefined,
      personalInfo: data.personalInfo ?? undefined,
      professionalProfile: data.professionalProfile ?? undefined,
      experiences: data.experiences ?? undefined,
      noExperience: data.noExperience ?? false,
      education: data.education ?? undefined,
      noEducation: data.noEducation ?? false,
      skills: data.skills ?? undefined,
      noSkills: data.noSkills ?? false,
      languages: data.languages ?? undefined,
      templateSelection: data.templateSelection ?? undefined,
    };
  }

  /**
   * BUG-011, BUG-012, BUG-013 FIX:
   * Validates that if a "no" flag is true, the corresponding array must be empty.
   * Data is FORBIDDEN, not ignored.
   */
  private validateFlagArrayConsistency(data: OnboardingProgress): void {
    if (data.noExperience && data.experiences && data.experiences.length > 0) {
      throw new BusinessRuleError(
        'Cannot have experiences when noExperience is true. Either set noExperience to false or provide an empty experiences array.',
      );
    }

    if (data.noEducation && data.education && data.education.length > 0) {
      throw new BusinessRuleError(
        'Cannot have education entries when noEducation is true. Either set noEducation to false or provide an empty education array.',
      );
    }

    if (data.noSkills && data.skills && data.skills.length > 0) {
      throw new BusinessRuleError(
        'Cannot have skills when noSkills is true. Either set noSkills to false or provide an empty skills array.',
      );
    }
  }

  /**
   * BUG-006 FIX: Check if progress has expired (36 hours).
   */
  private isProgressExpired(updatedAt: Date): boolean {
    const hoursElapsed = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60);
    return hoursElapsed >= PROGRESS_EXPIRATION_HOURS;
  }
}
