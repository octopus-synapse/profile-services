/**
 * In-Memory User Preferences Repository for Testing
 *
 * Extends UserPreferencesRepositoryPort abstract class with in-memory storage.
 * Provides helper methods for test setup and assertions.
 */

import { UserPreferencesRepositoryPort } from '../../../users/application/ports/user-preferences.port';
import type {
  FullUserPreferences,
  UpdateFullPreferencesData,
  UpdatePreferencesData,
  UserPreferences,
} from '../../../users/domain/types';

export class InMemoryUserPreferencesRepository extends UserPreferencesRepositoryPort {
  private users = new Set<string>();
  private preferences = new Map<string, UserPreferences>();
  private fullPreferences = new Map<string, FullUserPreferences>();

  // ============ Test Helpers ============

  /**
   * Seed a user ID (to indicate user exists)
   */
  seedUser(userId: string): void {
    this.users.add(userId);
  }

  /**
   * Seed basic preferences for a user
   */
  seedPreferences(userId: string, prefs: UserPreferences): void {
    this.users.add(userId);
    this.preferences.set(userId, prefs);
  }

  /**
   * Seed full preferences for a user
   */
  seedFullPreferences(userId: string, prefs: Partial<FullUserPreferences>): void {
    this.users.add(userId);
    const now = new Date();
    const fullPrefs: FullUserPreferences = {
      id: prefs.id ?? `pref-${userId}`,
      userId: userId,
      theme: prefs.theme ?? 'light',
      palette: prefs.palette ?? 'default',
      bannerColor: prefs.bannerColor ?? null,
      language: prefs.language ?? 'en',
      dateFormat: prefs.dateFormat ?? 'MM/DD/YYYY',
      timezone: prefs.timezone ?? 'UTC',
      emailNotifications: prefs.emailNotifications ?? true,
      resumeExpiryAlerts: prefs.resumeExpiryAlerts ?? true,
      weeklyDigest: prefs.weeklyDigest ?? false,
      marketingEmails: prefs.marketingEmails ?? false,
      emailMilestones: prefs.emailMilestones ?? true,
      emailShareExpiring: prefs.emailShareExpiring ?? true,
      digestFrequency: prefs.digestFrequency ?? 'WEEKLY',
      profileVisibility: prefs.profileVisibility ?? 'private',
      showEmail: prefs.showEmail ?? false,
      showPhone: prefs.showPhone ?? false,
      allowSearchEngineIndex: prefs.allowSearchEngineIndex ?? false,
      defaultExportFormat: prefs.defaultExportFormat ?? 'pdf',
      includePhotoInExport: prefs.includePhotoInExport ?? true,
      applyMode: prefs.applyMode ?? 'ONE_CLICK',
      applyCriteria: prefs.applyCriteria ?? null,
      createdAt: prefs.createdAt ?? now,
      updatedAt: prefs.updatedAt ?? now,
    };
    this.fullPreferences.set(userId, fullPrefs);
  }

  /**
   * Get preferences for a user
   */
  getPreferences(userId: string): UserPreferences | undefined {
    return this.preferences.get(userId);
  }

  /**
   * Get full preferences for a user
   */
  getFullPreferences(userId: string): FullUserPreferences | undefined {
    return this.fullPreferences.get(userId);
  }

  /**
   * Check if a user was updated
   */
  wasUpdated(userId: string): boolean {
    return this.preferences.has(userId) || this.fullPreferences.has(userId);
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.users.clear();
    this.preferences.clear();
    this.fullPreferences.clear();
  }

  // ============ Repository Port Implementation ============

  async userExists(userId: string): Promise<boolean> {
    return this.users.has(userId);
  }

  async findPreferences(userId: string): Promise<UserPreferences | null> {
    return this.preferences.get(userId) ?? null;
  }

  async updatePreferences(userId: string, data: UpdatePreferencesData): Promise<void> {
    const existing = this.preferences.get(userId) ?? {};
    this.preferences.set(userId, { ...existing, ...data });
  }

  async findFullPreferences(userId: string): Promise<FullUserPreferences | null> {
    return this.fullPreferences.get(userId) ?? null;
  }

  async upsertFullPreferences(
    userId: string,
    data: UpdateFullPreferencesData,
  ): Promise<FullUserPreferences> {
    const existing = this.fullPreferences.get(userId);
    const now = new Date();

    // Pull applyCriteria out so the base spread doesn't clobber the full
    // criteria object with a partial patch. We merge it explicitly below.
    const { applyCriteria: criteriaPatch, ...scalarPatch } = data;

    if (existing) {
      const mergedCriteria = criteriaPatch
        ? {
            minFit: criteriaPatch.minFit ?? existing.applyCriteria?.minFit ?? null,
            stacks: criteriaPatch.stacks ?? existing.applyCriteria?.stacks ?? [],
            seniorities: criteriaPatch.seniorities ?? existing.applyCriteria?.seniorities ?? [],
            remotePolicies:
              criteriaPatch.remotePolicies ?? existing.applyCriteria?.remotePolicies ?? [],
            paymentCurrencies:
              criteriaPatch.paymentCurrencies ?? existing.applyCriteria?.paymentCurrencies ?? [],
            minSalaryUsd:
              criteriaPatch.minSalaryUsd ?? existing.applyCriteria?.minSalaryUsd ?? null,
            defaultCover:
              criteriaPatch.defaultCover ?? existing.applyCriteria?.defaultCover ?? null,
          }
        : existing.applyCriteria;

      const updated: FullUserPreferences = {
        ...existing,
        ...scalarPatch,
        applyCriteria: mergedCriteria,
        updatedAt: now,
      };
      this.fullPreferences.set(userId, updated);
      return updated;
    }

    const newPrefs: FullUserPreferences = {
      id: `pref-${userId}`,
      userId: userId,
      theme: data.theme ?? 'light',
      palette: data.palette ?? 'default',
      bannerColor: data.bannerColor ?? null,
      language: data.language ?? 'en',
      dateFormat: data.dateFormat ?? 'MM/DD/YYYY',
      timezone: data.timezone ?? 'UTC',
      emailNotifications: data.emailNotifications ?? true,
      resumeExpiryAlerts: data.resumeExpiryAlerts ?? true,
      weeklyDigest: data.weeklyDigest ?? false,
      marketingEmails: data.marketingEmails ?? false,
      emailMilestones: data.emailMilestones ?? true,
      emailShareExpiring: data.emailShareExpiring ?? true,
      digestFrequency: data.digestFrequency ?? 'WEEKLY',
      profileVisibility: data.profileVisibility ?? 'private',
      showEmail: data.showEmail ?? false,
      showPhone: data.showPhone ?? false,
      allowSearchEngineIndex: data.allowSearchEngineIndex ?? false,
      defaultExportFormat: data.defaultExportFormat ?? 'pdf',
      includePhotoInExport: data.includePhotoInExport ?? true,
      applyMode: data.applyMode ?? 'ONE_CLICK',
      applyCriteria: criteriaPatch
        ? {
            minFit: criteriaPatch.minFit ?? null,
            stacks: criteriaPatch.stacks ?? [],
            seniorities: criteriaPatch.seniorities ?? [],
            remotePolicies: criteriaPatch.remotePolicies ?? [],
            paymentCurrencies: criteriaPatch.paymentCurrencies ?? [],
            minSalaryUsd: criteriaPatch.minSalaryUsd ?? null,
            defaultCover: criteriaPatch.defaultCover ?? null,
          }
        : null,
      createdAt: now,
      updatedAt: now,
    };
    this.fullPreferences.set(userId, newPrefs);
    return newPrefs;
  }
}
