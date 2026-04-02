/**
 * User Preferences Service (Facade)
 *
 * Delegates to use cases following Clean Architecture.
 * Single Responsibility: Facade that delegates to specific use cases.
 */

import { Inject, Injectable } from '@nestjs/common';
import type { UpdateFullPreferences, UpdatePreferences } from '@/shared-kernel';
import {
  type FullUserPreferences,
  USER_PREFERENCES_USE_CASES,
  type UserPreferences,
  type UserPreferencesUseCases,
} from '../ports/user-preferences.port';

@Injectable()
export class UserPreferencesService {
  constructor(
    @Inject(USER_PREFERENCES_USE_CASES)
    private readonly useCases: UserPreferencesUseCases,
  ) {}

  /**
   * Get user preferences
   * @returns UserPreferences (domain data, not envelope)
   */
  async getPreferences(userId: string): Promise<UserPreferences> {
    return this.useCases.getPreferencesUseCase.execute(userId);
  }

  /**
   * Update user preferences
   * @returns void (not envelope)
   */
  async updatePreferences(userId: string, data: UpdatePreferences): Promise<void> {
    return this.useCases.updatePreferencesUseCase.execute(userId, data);
  }

  /**
   * Get full user preferences
   * @returns FullUserPreferences or empty object (domain data, not envelope)
   */
  async getFullPreferences(userId: string): Promise<FullUserPreferences | Record<string, never>> {
    return this.useCases.getFullPreferencesUseCase.execute(userId);
  }

  /**
   * Update full user preferences
   * @returns FullUserPreferences (domain data, not envelope)
   */
  async updateFullPreferences(
    userId: string,
    data: UpdateFullPreferences,
  ): Promise<FullUserPreferences> {
    return this.useCases.updateFullPreferencesUseCase.execute(userId, data);
  }
}
