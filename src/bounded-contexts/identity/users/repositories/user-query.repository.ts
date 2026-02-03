/**
 * User Query Repository
 * Single Responsibility: Read operations for user data
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { User, UserPreferences } from '@prisma/client';

@Injectable()
export class UserQueryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserById(userId: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async findUserWithPreferencesById(
    userId: string,
  ): Promise<(User & { preferences: UserPreferences | null }) | null> {
    return await this.prisma.user.findUnique({
      where: { id: userId },
      include: { preferences: true },
    });
  }

  async findUserByUsername(
    username: string,
  ): Promise<(User & { preferences: UserPreferences | null }) | null> {
    return await this.prisma.user.findUnique({
      where: { username },
      include: { preferences: true },
    });
  }

  async findUserProfileById(userId: string): Promise<Partial<User> | null> {
    return await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        username: true,
        usernameUpdatedAt: true,
        displayName: true,
        photoURL: true,
        bio: true,
        location: true,
        phone: true,
        website: true,
        linkedin: true,
        github: true,
      },
    });
  }

  async findUserPreferencesById(userId: string): Promise<Partial<User> | null> {
    return await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        displayName: true,
        photoURL: true,
      },
    });
  }

  async findFullUserPreferencesByUserId(
    userId: string,
  ): Promise<UserPreferences | null> {
    return await this.prisma.userPreferences.findUnique({
      where: { userId },
    });
  }

  async isUsernameTaken(
    username: string,
    excludeUserId?: string,
  ): Promise<boolean> {
    const existingUser = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!existingUser) return false;
    if (excludeUserId && existingUser.id === excludeUserId) return false;
    return true;
  }

  async findLastUsernameUpdateByUserId(userId: string): Promise<Date | null> {
    const foundUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { usernameUpdatedAt: true },
    });
    return foundUser?.usernameUpdatedAt ?? null;
  }
}
