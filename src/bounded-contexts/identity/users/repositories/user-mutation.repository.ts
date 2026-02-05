/**
 * User Mutation Repository
 * Single Responsibility: Write operations for user data
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { User, UserPreferences } from '@prisma/client';
import {
  UpdateProfile,
  UpdatePreferences,
  type UpdateFullPreferences,
} from '@/shared-kernel';

@Injectable()
export class UserMutationRepository {
  private readonly logger = new Logger(UserMutationRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async createUserAccount(userData: {
    id: string;
    email: string;
    displayName?: string;
    photoURL?: string;
  }): Promise<User> {
    this.logger.log(`Creating user account: ${userData.email}`);
    return await this.prisma.user.create({ data: userData });
  }

  async updateUserAccount(
    userId: string,
    userData: Partial<User>,
  ): Promise<User> {
    this.logger.log(`Updating user account: ${userId}`);
    return await this.prisma.user.update({
      where: { id: userId },
      data: userData,
    });
  }

  async deleteUserAccount(userId: string): Promise<void> {
    this.logger.log(`Deleting user account: ${userId}`);
    await this.prisma.user.delete({ where: { id: userId } });
  }

  async updateUserProfile(
    userId: string,
    profile: UpdateProfile,
  ): Promise<User> {
    this.logger.log(`Updating profile for user: ${userId}`);
    return await this.prisma.user.update({
      where: { id: userId },
      data: profile,
    });
  }

  async updateUserPreferences(
    userId: string,
    preferences: UpdatePreferences,
  ): Promise<void> {
    this.logger.log(`Updating preferences for user: ${userId}`);
    await this.prisma.user.update({
      where: { id: userId },
      data: preferences,
    });
  }

  async upsertFullUserPreferences(
    userId: string,
    preferences: UpdateFullPreferences,
  ): Promise<UserPreferences> {
    this.logger.log(`Upserting full preferences for user: ${userId}`);
    return await this.prisma.userPreferences.upsert({
      where: { userId },
      create: { userId, ...preferences },
      update: preferences,
    });
  }

  async updatePalette(userId: string, palette: string): Promise<void> {
    this.logger.log(`Updating palette for user: ${userId}`);
    await this.prisma.userPreferences.upsert({
      where: { userId },
      create: { userId, palette },
      update: { palette },
    });
  }

  async updateBannerColor(userId: string, bannerColor: string): Promise<void> {
    this.logger.log(`Updating banner color for user: ${userId}`);
    await this.prisma.userPreferences.upsert({
      where: { userId },
      create: { userId, bannerColor },
      update: { bannerColor },
    });
  }

  async updateUsername(userId: string, username: string): Promise<User> {
    this.logger.log(`Updating username for user: ${userId}`);
    return await this.prisma.user.update({
      where: { id: userId },
      data: { username, usernameUpdatedAt: new Date() },
    });
  }
}
