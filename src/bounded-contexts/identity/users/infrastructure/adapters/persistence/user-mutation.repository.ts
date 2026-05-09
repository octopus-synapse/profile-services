/**
 * User Mutation Repository
 * Single Responsibility: Write operations for user data
 */

import { User, UserPreferences } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  LoggerPort,
  type UpdateFullPreferences,
  UpdatePreferences,
  UpdateProfile,
} from '@/shared-kernel';

const CTX = 'UserMutationRepository';

export class UserMutationRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {}

  async createUserAccount(userData: {
    id: string;
    email: string;
    name?: string;
    photoURL?: string;
  }): Promise<User> {
    this.logger.log(`Creating user account: ${userData.id}`, CTX);
    return await this.prisma.user.create({ data: userData });
  }

  async updateUserAccount(userId: string, userData: Partial<User>): Promise<User> {
    this.logger.log(`Updating user account: ${userId}`, CTX);
    return await this.prisma.user.update({
      where: { id: userId },
      data: userData,
    });
  }

  async deleteUserAccount(userId: string): Promise<void> {
    this.logger.log(`Deleting user account: ${userId}`, CTX);
    await this.prisma.user.delete({ where: { id: userId } });
  }

  async updateUserProfile(userId: string, profile: UpdateProfile): Promise<User> {
    this.logger.log(`Updating profile for user: ${userId}`, CTX);
    return await this.prisma.user.update({
      where: { id: userId },
      data: profile,
    });
  }

  async updateUserPreferences(userId: string, preferences: UpdatePreferences): Promise<void> {
    this.logger.log(`Updating preferences for user: ${userId}`, CTX);
    await this.prisma.user.update({
      where: { id: userId },
      data: preferences,
    });
  }

  async upsertFullUserPreferences(
    userId: string,
    preferences: UpdateFullPreferences,
  ): Promise<UserPreferences> {
    this.logger.log(`Upserting full preferences for user: ${userId}`, CTX);
    // `applyCriteria` is a nested relation on the Prisma model — Prisma rejects
    // raw partials in a spread. Pull it out so only scalar fields flow into
    // `create` / `update` here; the dedicated preferences repository handles
    // the criteria upsert explicitly.
    const { applyCriteria: _criteria, ...scalars } = preferences;
    return await this.prisma.userPreferences.upsert({
      where: { userId },
      create: { userId, ...scalars },
      update: scalars,
    });
  }

  async updatePalette(userId: string, palette: string): Promise<void> {
    this.logger.log(`Updating palette for user: ${userId}`, CTX);
    await this.prisma.userPreferences.upsert({
      where: { userId },
      create: { userId, palette },
      update: { palette },
    });
  }

  async updateBannerColor(userId: string, bannerColor: string): Promise<void> {
    this.logger.log(`Updating banner color for user: ${userId}`, CTX);
    await this.prisma.userPreferences.upsert({
      where: { userId },
      create: { userId, bannerColor },
      update: { bannerColor },
    });
  }

  async updateUsername(userId: string, username: string): Promise<User> {
    this.logger.log(`Updating username for user: ${userId}`, CTX);
    return await this.prisma.user.update({
      where: { id: userId },
      data: { username, usernameUpdatedAt: new Date() },
    });
  }
}
