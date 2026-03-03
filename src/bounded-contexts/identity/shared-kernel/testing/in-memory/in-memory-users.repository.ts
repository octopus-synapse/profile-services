/**
 * In-Memory Users Repository for Testing
 *
 * Implements UsersRepository interface with in-memory storage.
 * Provides helper methods for test setup and assertions.
 */

import type { User, UserPreferences } from '@prisma/client';
import type { UpdateFullPreferences, UpdatePreferences, UpdateProfile } from '@/shared-kernel';

interface StoredUser extends User {
  preferences?: UserPreferences | null;
}

export class InMemoryUsersRepository {
  private users = new Map<string, StoredUser>();
  private preferences = new Map<string, UserPreferences>();
  private takenUsernames = new Set<string>();

  // ============ Test Helpers ============

  /**
   * Seed a user for testing
   */
  seedUser(user: Partial<StoredUser> & { id: string }): void {
    const fullUser: StoredUser = {
      id: user.id,
      name: user.name ?? null,
      email: user.email ?? null,
      emailVerified: user.emailVerified ?? null,
      image: user.image ?? null,
      passwordHash: user.passwordHash ?? null,
      isActive: user.isActive ?? true,
      lastLoginAt: user.lastLoginAt ?? null,
      username: user.username ?? null,
      usernameUpdatedAt: user.usernameUpdatedAt ?? null,
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      bio: user.bio ?? null,
      location: user.location ?? null,
      phone: user.phone ?? null,
      website: user.website ?? null,
      linkedin: user.linkedin ?? null,
      github: user.github ?? null,
      primaryResumeId: user.primaryResumeId ?? null,
      hasCompletedOnboarding: user.hasCompletedOnboarding ?? false,
      onboardingCompletedAt: user.onboardingCompletedAt ?? null,
      createdAt: user.createdAt ?? new Date(),
      updatedAt: user.updatedAt ?? new Date(),
      preferences: user.preferences ?? null,
    };
    this.users.set(user.id, fullUser);

    if (user.username) {
      this.takenUsernames.add(user.username.toLowerCase());
    }
  }

  /**
   * Seed user preferences
   */
  seedPreferences(prefs: Partial<UserPreferences> & { id: string; userId: string }): void {
    const fullPrefs: UserPreferences = {
      id: prefs.id,
      userId: prefs.userId,
      theme: prefs.theme ?? 'dark',
      palette: prefs.palette ?? 'ocean',
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
      createdAt: prefs.createdAt ?? new Date(),
      updatedAt: prefs.updatedAt ?? new Date(),
    };
    this.preferences.set(prefs.userId, fullPrefs);

    // Link to user if exists
    const user = this.users.get(prefs.userId);
    if (user) {
      user.preferences = fullPrefs;
    }
  }

  /**
   * Mark a username as taken (for availability tests)
   */
  markUsernameTaken(username: string): void {
    this.takenUsernames.add(username.toLowerCase());
  }

  /**
   * Get user by ID (test helper)
   */
  getUser(userId: string): StoredUser | undefined {
    return this.users.get(userId);
  }

  /**
   * Get all users (test helper)
   */
  getAllUsers(): StoredUser[] {
    return Array.from(this.users.values());
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.users.clear();
    this.preferences.clear();
    this.takenUsernames.clear();
  }

  // ============ Repository Interface Implementation ============

  async findUserById(userId: string): Promise<User | null> {
    const user = this.users.get(userId);
    return user ?? null;
  }

  async findUserWithPreferencesById(
    userId: string,
  ): Promise<(User & { preferences: UserPreferences | null }) | null> {
    const user = this.users.get(userId);
    if (!user) return null;

    return {
      ...user,
      preferences: this.preferences.get(userId) ?? null,
    };
  }

  async findUserByUsername(
    username: string,
  ): Promise<(User & { preferences: UserPreferences | null }) | null> {
    const normalizedUsername = username.toLowerCase();
    const user = Array.from(this.users.values()).find(
      (u) => u.username?.toLowerCase() === normalizedUsername,
    );

    if (!user) return null;

    return {
      ...user,
      preferences: this.preferences.get(user.id) ?? null,
    };
  }

  async findUserProfileById(userId: string): Promise<Partial<User> | null> {
    const user = this.users.get(userId);
    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      photoURL: user.photoURL,
      bio: user.bio,
      location: user.location,
      website: user.website,
      linkedin: user.linkedin,
      github: user.github,
    };
  }

  async findUserPreferencesById(userId: string): Promise<Partial<User> | null> {
    const user = this.users.get(userId);
    if (!user) return null;

    const prefs = this.preferences.get(userId);
    return prefs ? { ...user, ...prefs } : user;
  }

  async findFullUserPreferencesByUserId(userId: string): Promise<UserPreferences | null> {
    return this.preferences.get(userId) ?? null;
  }

  async isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean> {
    const normalizedUsername = username.toLowerCase();

    // Check explicit taken set
    if (this.takenUsernames.has(normalizedUsername)) {
      // If excluding a user, check if it's their username
      if (excludeUserId) {
        const user = this.users.get(excludeUserId);
        if (user?.username?.toLowerCase() === normalizedUsername) {
          return false;
        }
      }
      return true;
    }

    // Check users
    for (const user of this.users.values()) {
      if (user.username?.toLowerCase() === normalizedUsername) {
        if (excludeUserId && user.id === excludeUserId) {
          continue;
        }
        return true;
      }
    }

    return false;
  }

  async findLastUsernameUpdateByUserId(userId: string): Promise<Date | null> {
    const user = this.users.get(userId);
    return user?.usernameUpdatedAt ?? null;
  }

  async createUserAccount(userData: {
    id: string;
    email: string;
    displayName?: string;
    photoURL?: string;
  }): Promise<User> {
    const now = new Date();
    const user: StoredUser = {
      id: userData.id,
      email: userData.email,
      displayName: userData.displayName ?? null,
      photoURL: userData.photoURL ?? null,
      name: null,
      emailVerified: null,
      image: null,
      passwordHash: null,
      isActive: true,
      lastLoginAt: null,
      username: null,
      usernameUpdatedAt: null,
      bio: null,
      location: null,
      phone: null,
      website: null,
      linkedin: null,
      github: null,
      primaryResumeId: null,
      hasCompletedOnboarding: false,
      onboardingCompletedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(userData.id, user);
    return user;
  }

  async updateUserAccount(userId: string, userData: Partial<User>): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const updated: StoredUser = {
      ...user,
      ...userData,
      updatedAt: new Date(),
    };
    this.users.set(userId, updated);
    return updated;
  }

  async deleteUserAccount(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user?.username) {
      this.takenUsernames.delete(user.username.toLowerCase());
    }
    this.users.delete(userId);
    this.preferences.delete(userId);
  }

  async updateUserProfile(userId: string, profile: UpdateProfile): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const updated: StoredUser = {
      ...user,
      ...profile,
      updatedAt: new Date(),
    };
    this.users.set(userId, updated);
    return updated;
  }

  async updateUserPreferences(userId: string, preferences: UpdatePreferences): Promise<void> {
    const existingPrefs = this.preferences.get(userId);
    if (existingPrefs) {
      this.preferences.set(userId, {
        ...existingPrefs,
        ...preferences,
        updatedAt: new Date(),
      } as UserPreferences);
    }
  }

  async upsertFullUserPreferences(
    userId: string,
    preferences: UpdateFullPreferences,
  ): Promise<UserPreferences> {
    const existingPrefs = this.preferences.get(userId);
    const now = new Date();

    const newPrefs: UserPreferences = {
      id: existingPrefs?.id ?? `pref-${userId}`,
      userId,
      theme: preferences.theme ?? existingPrefs?.theme ?? 'dark',
      palette: preferences.palette ?? existingPrefs?.palette ?? 'ocean',
      bannerColor: preferences.bannerColor ?? existingPrefs?.bannerColor ?? null,
      language: preferences.language ?? existingPrefs?.language ?? 'en',
      dateFormat: preferences.dateFormat ?? existingPrefs?.dateFormat ?? 'MM/DD/YYYY',
      timezone: preferences.timezone ?? existingPrefs?.timezone ?? 'UTC',
      emailNotifications:
        preferences.emailNotifications ?? existingPrefs?.emailNotifications ?? true,
      resumeExpiryAlerts:
        preferences.resumeExpiryAlerts ?? existingPrefs?.resumeExpiryAlerts ?? true,
      weeklyDigest: preferences.weeklyDigest ?? existingPrefs?.weeklyDigest ?? false,
      marketingEmails: preferences.marketingEmails ?? existingPrefs?.marketingEmails ?? false,
      emailMilestones: preferences.emailMilestones ?? existingPrefs?.emailMilestones ?? true,
      emailShareExpiring:
        preferences.emailShareExpiring ?? existingPrefs?.emailShareExpiring ?? true,
      digestFrequency: preferences.digestFrequency ?? existingPrefs?.digestFrequency ?? 'WEEKLY',
      profileVisibility:
        preferences.profileVisibility ?? existingPrefs?.profileVisibility ?? 'private',
      showEmail: preferences.showEmail ?? existingPrefs?.showEmail ?? false,
      showPhone: preferences.showPhone ?? existingPrefs?.showPhone ?? false,
      allowSearchEngineIndex:
        preferences.allowSearchEngineIndex ?? existingPrefs?.allowSearchEngineIndex ?? false,
      defaultExportFormat:
        preferences.defaultExportFormat ?? existingPrefs?.defaultExportFormat ?? 'pdf',
      includePhotoInExport:
        preferences.includePhotoInExport ?? existingPrefs?.includePhotoInExport ?? true,
      createdAt: existingPrefs?.createdAt ?? now,
      updatedAt: now,
    };

    this.preferences.set(userId, newPrefs);
    return newPrefs;
  }

  async updatePalette(userId: string, palette: string): Promise<void> {
    const prefs = this.preferences.get(userId);
    if (prefs) {
      prefs.palette = palette;
      prefs.updatedAt = new Date();
    }
  }

  async updateBannerColor(userId: string, bannerColor: string): Promise<void> {
    const prefs = this.preferences.get(userId);
    if (prefs) {
      prefs.bannerColor = bannerColor;
      prefs.updatedAt = new Date();
    }
  }

  async updateUsername(userId: string, username: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Remove old username from taken set
    if (user.username) {
      this.takenUsernames.delete(user.username.toLowerCase());
    }

    // Update user
    const updated: StoredUser = {
      ...user,
      username,
      usernameUpdatedAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(userId, updated);

    // Add new username to taken set
    this.takenUsernames.add(username.toLowerCase());

    return updated;
  }
}
